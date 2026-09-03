import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  AppDatabase, 
  Branch, 
  User, 
  Company, 
  Currency, 
  Country, 
  ExchangeRate, 
  BlacklistEntry, 
  RemittancePurpose, 
  Customer, 
  RemittanceTransaction, 
  AuditRecord, 
  SupabaseConfig, 
  Language, 
  UserRole,
  RemittanceStatus
} from '../types';
import { initialDatabase } from './mockData';
import { translations } from '../i18n/translations';
import { getSupabaseClient, resetSupabaseClient } from './supabase';

const DB_STORAGE_KEY = 'REMITTANCE_APP_DB_V1';

interface RemittanceContextType {
  db: AppDatabase;
  language: Language;
  t: typeof translations.en;
  setLanguage: (lang: Language) => void;
  currentUser: User;
  switchUser: (userId: string) => void;
  
  // Screening
  checkBlacklist: (nrc: string, passbook?: string, name?: string) => BlacklistEntry | null;
  
  // Outward & Inward Transactions
  createOutwardRemittance: (txData: Partial<RemittanceTransaction>) => Promise<RemittanceTransaction>;
  createInwardRemittance: (txData: Partial<RemittanceTransaction>) => Promise<RemittanceTransaction>;
  approveTransaction: (id: string, note?: string) => Promise<boolean>;
  rejectTransaction: (id: string, reason: string) => Promise<boolean>;
  holdTransaction: (id: string, note: string) => Promise<boolean>;
  payoutInwardTransaction: (id: string, note?: string) => Promise<boolean>;
  lookupTransactionByMtcn: (mtcn: string) => RemittanceTransaction | undefined;
  
  // Master Setups (Add, Edit, Delete)
  // 1. Branch
  saveBranch: (branch: Branch) => void;
  deleteBranch: (id: string) => void;
  
  // 2. User
  saveUser: (user: User) => void;
  deleteUser: (id: string) => void;
  
  // 3. Company
  saveCompany: (company: Company) => void;
  deleteCompany: (id: string) => void;
  
  // 4. Currency
  saveCurrency: (currency: Currency) => void;
  deleteCurrency: (id: string) => void;
  
  // 5. Country
  saveCountry: (country: Country) => void;
  deleteCountry: (id: string) => void;
  
  // 6. Exchange Rate
  saveExchangeRate: (rate: ExchangeRate) => void;
  deleteExchangeRate: (id: string) => void;
  getExchangeRate: (from: string, to: string) => number;
  
  // 7. Blacklist (with Myanmar NRC & Passbook note)
  saveBlacklist: (entry: BlacklistEntry) => void;
  deleteBlacklist: (id: string) => void;
  
  // 8. Purpose
  savePurpose: (purpose: RemittancePurpose) => void;
  deletePurpose: (id: string) => void;
  
  // 9. Customer
  saveCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  
  // Audit Logs
  logAction: (
    action: AuditRecord['action'],
    entityType: AuditRecord['entityType'],
    entityId: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => void;
  
  // Backup & Restore
  exportBackupJson: () => string;
  exportDatabaseJson: () => string;
  restoreBackupJson: (jsonString: string) => boolean;
  restoreDatabaseFromJson: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
  resetToDefaultSeed: () => void;
  
  // Supabase
  updateSupabaseConfig: (config: Partial<SupabaseConfig>) => void;
  syncDataToSupabase: () => Promise<{ success: boolean; message: string }>;
  fetchDataFromSupabase: () => Promise<{ success: boolean; message: string }>;

  // Authentication & Supabase User Verification
  isAuthenticated: boolean;
  loginWithSupabase: (
    usernameOrEmail: string, 
    password?: string
  ) => Promise<{
    success: boolean;
    message: string;
    user?: User;
    isRlsBlocked?: boolean;
    isTableMissing?: boolean;
    needsConfig?: boolean;
  }>;
  logout: () => void;
  fetchSupabaseUsers: () => Promise<{ success: boolean; users?: User[]; message?: string }>;
  seedUsersToSupabase: () => Promise<{ success: boolean; message: string }>;
}

const RemittanceContext = createContext<RemittanceContextType | null>(null);

export const RemittanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => {
    const metaEnv = (import.meta as any)?.env || {};
    const envUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
    const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

    try {
      const saved = localStorage.getItem(DB_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.branches && parsed.users && parsed.transactions) {
          // If env vars are provided and local config is empty, fill them in
          if (envUrl && !parsed.supabaseConfig?.url) {
            parsed.supabaseConfig = {
              ...(parsed.supabaseConfig || initialDatabase.supabaseConfig),
              url: envUrl,
              anonKey: envKey,
            };
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load local DB state:', err);
    }

    const base = { ...initialDatabase };
    if (envUrl) {
      base.supabaseConfig = {
        ...base.supabaseConfig,
        url: envUrl,
        anonKey: envKey,
      };
    }
    return base;
  });

  // Save to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }, [db]);

  // Authentication state - Require Supabase user login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const sessionStr = sessionStorage.getItem('REMITTANCE_AUTH_SESSION');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session && session.userId) {
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load auth session:', e);
    }
    return false;
  });

  const language = db.activeLanguage || 'my';
  const t = translations[language] || translations.en;

  const setLanguage = (lang: Language) => {
    setDb(prev => ({ ...prev, activeLanguage: lang }));
  };

  const currentUser = db.users.find(u => u.id === db.currentUserId) || db.users[0];

  const switchUser = (userId: string) => {
    const targetUser = db.users.find(u => u.id === userId);
    if (targetUser) {
      setDb(prev => ({ ...prev, currentUserId: userId }));
      logActionDirect(
        'LOGIN',
        'SYSTEM',
        userId,
        `Switched active operator context to ${targetUser.fullName} (${targetUser.role})`
      );
    }
  };

  // Helper direct audit logger to avoid stale closures
  const logActionDirect = (
    action: AuditRecord['action'],
    entityType: AuditRecord['entityType'],
    entityId: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const newRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action,
      entityType,
      entityId,
      details,
      previousValue,
      newValue,
    };
    setDb(prev => ({
      ...prev,
      auditLogs: [newRecord, ...prev.auditLogs]
    }));
  };

  const logAction = useCallback((
    action: AuditRecord['action'],
    entityType: AuditRecord['entityType'],
    entityId: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => {
    logActionDirect(action, entityType, entityId, details, previousValue, newValue);
  }, [currentUser]);

  // Blacklist screening
  const checkBlacklist = useCallback((nrc: string, passbook?: string, name?: string): BlacklistEntry | null => {
    if (!nrc && !passbook && !name) return null;
    const cleanNrc = (nrc || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanPass = (passbook || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanName = (name || '').trim().toLowerCase();

    for (const item of db.blacklist) {
      if (!item.active) continue;
      
      const itemNrc = (item.nrcNumber || '').trim().toLowerCase().replace(/\s+/g, '');
      const itemPass = (item.passbookNumber || '').trim().toLowerCase().replace(/\s+/g, '');
      const itemEn = (item.fullNameEn || '').trim().toLowerCase();
      const itemMm = (item.fullNameMm || '').trim().toLowerCase();

      if (cleanNrc && itemNrc && (cleanNrc === itemNrc || cleanNrc.includes(itemNrc) || itemNrc.includes(cleanNrc))) {
        return item;
      }
      if (cleanPass && itemPass && (cleanPass === itemPass || cleanPass.includes(itemPass))) {
        return item;
      }
      if (cleanName && ((itemEn && cleanName.includes(itemEn)) || (itemMm && cleanName.includes(itemMm)))) {
        return item;
      }
    }
    return null;
  }, [db.blacklist]);

  // Exchange rate lookup
  const getExchangeRate = useCallback((from: string, to: string): number => {
    if (from === to) return 1;
    
    // Direct match
    const direct = db.exchangeRates.find(r => r.fromCurrency === from && r.toCurrency === to);
    if (direct) return direct.transferRate || direct.sellRate;

    // Inverse match
    const inverse = db.exchangeRates.find(r => r.fromCurrency === to && r.toCurrency === from);
    if (inverse) {
      const rate = inverse.transferRate || inverse.buyRate;
      return rate > 0 ? 1 / rate : 1;
    }

    // Default fallbacks for base MMK
    if (to === 'MMK') {
      const base = db.exchangeRates.find(r => r.fromCurrency === from && r.toCurrency === 'MMK');
      if (base) return base.transferRate;
    }
    if (from === 'MMK') {
      const base = db.exchangeRates.find(r => r.fromCurrency === to && r.toCurrency === 'MMK');
      if (base && base.transferRate > 0) return 1 / base.transferRate;
    }

    return 1;
  }, [db.exchangeRates]);

  // Generate unique MTCN
  const generateMtcn = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  // Generate Transaction No
  const generateTxNo = (type: 'OUTWARD' | 'INWARD') => {
    const prefix = type === 'OUTWARD' ? 'REM-OUT' : 'REM-INW';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${dateStr}-${rand}`;
  };

  // 1. Create Outward Remittance
  const createOutwardRemittance = async (txData: Partial<RemittanceTransaction>): Promise<RemittanceTransaction> => {
    const txNo = generateTxNo('OUTWARD');
    const mtcn = generateMtcn();

    // Check blacklist on sender and receiver
    const senderBlacklist = checkBlacklist(txData.senderNrc || '', txData.senderPassbook, txData.senderName);
    const receiverBlacklist = checkBlacklist(txData.receiverNrc || '', txData.receiverPassbook, txData.receiverName);
    
    let blacklistAlert: string | undefined = undefined;
    if (senderBlacklist) {
      blacklistAlert = `SENDER_MATCH: ${senderBlacklist.fullNameEn} (${senderBlacklist.reason})`;
    } else if (receiverBlacklist) {
      blacklistAlert = `RECEIVER_MATCH: ${receiverBlacklist.fullNameEn} (${receiverBlacklist.reason})`;
    }

    const newTx: RemittanceTransaction = {
      id: `TX-${Date.now()}`,
      transactionNo: txNo,
      mtcn: mtcn,
      type: 'OUTWARD',
      scope: txData.scope || 'INTERNATIONAL',
      status: (txData.status as RemittanceStatus) || 'PENDING_APPROVAL',
      
      senderName: txData.senderName || '',
      senderNameMm: txData.senderNameMm || '',
      senderNrc: txData.senderNrc || '',
      senderPassbook: txData.senderPassbook || '',
      senderPassport: txData.senderPassport || '',
      senderPhone: txData.senderPhone || '',
      senderAddress: txData.senderAddress || '',
      senderCountryCode: txData.senderCountryCode || 'MM',
      
      receiverName: txData.receiverName || '',
      receiverNameMm: txData.receiverNameMm || '',
      receiverNrc: txData.receiverNrc || '',
      receiverPassbook: txData.receiverPassbook || '',
      receiverPassport: txData.receiverPassport || '',
      receiverPhone: txData.receiverPhone || '',
      receiverAddress: txData.receiverAddress || '',
      receiverCountryCode: txData.receiverCountryCode || 'TH',
      
      sourceCurrency: txData.sourceCurrency || 'MMK',
      targetCurrency: txData.targetCurrency || 'USD',
      sendAmount: Number(txData.sendAmount || 0),
      exchangeRate: Number(txData.exchangeRate || 1),
      receiveAmount: Number(txData.receiveAmount || 0),
      serviceFee: Number(txData.serviceFee || 0),
      commissionFee: Number(txData.commissionFee || 0),
      taxAmount: Number(txData.taxAmount || 0),
      totalPayableAmount: Number(txData.totalPayableAmount || 0),
      
      payoutMethod: txData.payoutMethod || 'CASH_PICKUP',
      payoutBankName: txData.payoutBankName,
      payoutAccountNumber: txData.payoutAccountNumber,
      
      sendingBranchId: txData.sendingBranchId || currentUser.branchId || 'BR-001',
      payoutBranchId: txData.payoutBranchId,
      partnerCompanyId: txData.partnerCompanyId,
      
      purposeId: txData.purposeId || 'PUR-001',
      purposeName: txData.purposeName || 'Family Maintenance & Living Support',
      senderNote: txData.senderNote,
      proofDocumentName: txData.proofDocumentName,
      
      blacklistChecked: true,
      blacklistAlert,
      
      creatorUserId: currentUser.id,
      creatorName: `${currentUser.fullName} (${currentUser.role})`,
      
      createdDate: new Date().toISOString(),
    };

    setDb(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions]
    }));

    logActionDirect(
      'CREATE',
      'OUTWARD',
      newTx.transactionNo,
      `Created Outward Remittance ${newTx.transactionNo} (MTCN: ${newTx.mtcn}) for ${newTx.senderName} -> ${newTx.receiverName} (${newTx.sendAmount} ${newTx.sourceCurrency})`
    );

    return newTx;
  };

  // 2. Create Inward Remittance Claim / Entry
  const createInwardRemittance = async (txData: Partial<RemittanceTransaction>): Promise<RemittanceTransaction> => {
    const txNo = generateTxNo('INWARD');
    const mtcn = txData.mtcn || generateMtcn();

    const receiverBlacklist = checkBlacklist(txData.receiverNrc || '', txData.receiverPassbook, txData.receiverName);
    const senderBlacklist = checkBlacklist(txData.senderNrc || '', txData.senderPassbook, txData.senderName);

    let blacklistAlert: string | undefined = undefined;
    if (receiverBlacklist) {
      blacklistAlert = `BENEFICIARY_MATCH: ${receiverBlacklist.fullNameEn} (${receiverBlacklist.reason})`;
    } else if (senderBlacklist) {
      blacklistAlert = `SENDER_MATCH: ${senderBlacklist.fullNameEn} (${senderBlacklist.reason})`;
    }

    const newTx: RemittanceTransaction = {
      id: `TX-${Date.now()}`,
      transactionNo: txNo,
      mtcn: mtcn,
      type: 'INWARD',
      scope: txData.scope || 'INTERNATIONAL',
      status: (txData.status as RemittanceStatus) || 'PENDING_APPROVAL',
      
      senderName: txData.senderName || '',
      senderNameMm: txData.senderNameMm || '',
      senderNrc: txData.senderNrc || '',
      senderPassbook: txData.senderPassbook || '',
      senderPassport: txData.senderPassport || '',
      senderPhone: txData.senderPhone || '',
      senderAddress: txData.senderAddress || '',
      senderCountryCode: txData.senderCountryCode || 'TH',
      
      receiverName: txData.receiverName || '',
      receiverNameMm: txData.receiverNameMm || '',
      receiverNrc: txData.receiverNrc || '',
      receiverPassbook: txData.receiverPassbook || '',
      receiverPassport: txData.receiverPassport || '',
      receiverPhone: txData.receiverPhone || '',
      receiverAddress: txData.receiverAddress || '',
      receiverCountryCode: txData.receiverCountryCode || 'MM',
      
      sourceCurrency: txData.sourceCurrency || 'THB',
      targetCurrency: txData.targetCurrency || 'MMK',
      sendAmount: Number(txData.sendAmount || 0),
      exchangeRate: Number(txData.exchangeRate || 1),
      receiveAmount: Number(txData.receiveAmount || 0),
      serviceFee: Number(txData.serviceFee || 0),
      commissionFee: Number(txData.commissionFee || 0),
      taxAmount: 0,
      totalPayableAmount: Number(txData.receiveAmount || 0),
      
      payoutMethod: txData.payoutMethod || 'CASH_PICKUP',
      payoutBankName: txData.payoutBankName,
      payoutAccountNumber: txData.payoutAccountNumber,
      
      sendingBranchId: txData.sendingBranchId || 'BR-001',
      payoutBranchId: txData.payoutBranchId || currentUser.branchId || 'BR-001',
      partnerCompanyId: txData.partnerCompanyId,
      
      purposeId: txData.purposeId || 'PUR-004',
      purposeName: txData.purposeName || 'Overseas Worker Salary Remittance',
      senderNote: txData.senderNote,
      proofDocumentName: txData.proofDocumentName,
      
      blacklistChecked: true,
      blacklistAlert,
      
      creatorUserId: currentUser.id,
      creatorName: `${currentUser.fullName} (${currentUser.role})`,
      
      createdDate: new Date().toISOString(),
    };

    setDb(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions]
    }));

    logActionDirect(
      'CREATE',
      'INWARD',
      newTx.transactionNo,
      `Created Inward Remittance Claim ${newTx.transactionNo} (MTCN: ${newTx.mtcn}) for ${newTx.receiverName} (${newTx.receiveAmount} MMK payout)`
    );

    return newTx;
  };

  // 3. Approve Transaction (Checker)
  const approveTransaction = async (id: string, note?: string): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: 'APPROVED',
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      approvalNote: note || 'Transaction verified and approved by Checker.',
      approvedDate: new Date().toISOString(),
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t)
    }));

    logActionDirect(
      'APPROVE',
      tx.type === 'OUTWARD' ? 'OUTWARD' : 'INWARD',
      tx.transactionNo,
      `Checker ${currentUser.fullName} approved transaction ${tx.transactionNo} (MTCN: ${tx.mtcn}). Note: ${note || 'None'}`
    );

    return true;
  };

  // 4. Reject Transaction
  const rejectTransaction = async (id: string, reason: string): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: 'REJECTED',
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      rejectionReason: reason,
      approvedDate: new Date().toISOString(),
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t)
    }));

    logActionDirect(
      'REJECT',
      tx.type === 'OUTWARD' ? 'OUTWARD' : 'INWARD',
      tx.transactionNo,
      `Checker ${currentUser.fullName} rejected transaction ${tx.transactionNo}. Reason: ${reason}`
    );

    return true;
  };

  // 5. Put Transaction on Hold
  const holdTransaction = async (id: string, note: string): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: 'ON_HOLD',
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      approvalNote: note,
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t)
    }));

    logActionDirect(
      'HOLD',
      tx.type === 'OUTWARD' ? 'OUTWARD' : 'INWARD',
      tx.transactionNo,
      `Transaction ${tx.transactionNo} placed ON HOLD by ${currentUser.fullName}. Note: ${note}`
    );

    return true;
  };

  // 6. Complete Inward Payout (Cash / Account)
  const payoutInwardTransaction = async (id: string, note?: string): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: 'PAID_OUT',
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      approvalNote: note || 'Funds successfully disbursed to beneficiary.',
      paidOutDate: new Date().toISOString(),
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t)
    }));

    logActionDirect(
      'PAYOUT',
      'INWARD',
      tx.transactionNo,
      `Payout disbursed for MTCN ${tx.mtcn} to beneficiary ${tx.receiverName} (${tx.receiveAmount} MMK) by ${currentUser.fullName}`
    );

    return true;
  };

  // Lookup MTCN
  const lookupTransactionByMtcn = useCallback((mtcn: string): RemittanceTransaction | undefined => {
    const clean = mtcn.trim();
    return db.transactions.find(t => t.mtcn === clean || t.transactionNo === clean);
  }, [db.transactions]);

  // Master Setups CRUD Handlers (9 modules)
  // 1. Branch
  const saveBranch = (branch: Branch) => {
    const isNew = !db.branches.some(b => b.id === branch.id);
    setDb(prev => ({
      ...prev,
      branches: isNew ? [...prev.branches, branch] : prev.branches.map(b => b.id === branch.id ? branch : b)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'BRANCH',
      branch.code,
      `${isNew ? 'Added new' : 'Updated'} branch ${branch.code} - ${branch.nameEn} (${branch.city})`
    );
  };

  const deleteBranch = (id: string) => {
    const item = db.branches.find(b => b.id === id);
    setDb(prev => ({ ...prev, branches: prev.branches.filter(b => b.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'BRANCH', item.code, `Deleted branch ${item.code} (${item.nameEn})`);
    }
  };

  // 2. User
  const saveUser = (user: User) => {
    const isNew = !db.users.some(u => u.id === user.id);
    setDb(prev => ({
      ...prev,
      users: isNew ? [...prev.users, user] : prev.users.map(u => u.id === user.id ? user : u)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'USER',
      user.username,
      `${isNew ? 'Created user' : 'Updated user'} ${user.username} (${user.fullName}, Role: ${user.role})`
    );
  };

  const deleteUser = (id: string) => {
    const item = db.users.find(u => u.id === id);
    setDb(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'USER', item.username, `Deleted user account ${item.username} (${item.fullName})`);
    }
  };

  // 3. Company
  const saveCompany = (company: Company) => {
    const isNew = !db.companies.some(c => c.id === company.id);
    setDb(prev => ({
      ...prev,
      companies: isNew ? [...prev.companies, company] : prev.companies.map(c => c.id === company.id ? company : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'COMPANY',
      company.code,
      `${isNew ? 'Added partner company' : 'Updated partner company'} ${company.code} - ${company.nameEn}`
    );
  };

  const deleteCompany = (id: string) => {
    const item = db.companies.find(c => c.id === id);
    setDb(prev => ({ ...prev, companies: prev.companies.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'COMPANY', item.code, `Deleted partner company ${item.code} (${item.nameEn})`);
    }
  };

  // 4. Currency
  const saveCurrency = (currency: Currency) => {
    const isNew = !db.currencies.some(c => c.id === currency.id);
    setDb(prev => ({
      ...prev,
      currencies: isNew ? [...prev.currencies, currency] : prev.currencies.map(c => c.id === currency.id ? currency : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'CURRENCY',
      currency.code,
      `${isNew ? 'Added currency' : 'Updated currency'} ${currency.code} (${currency.nameEn})`
    );
  };

  const deleteCurrency = (id: string) => {
    const item = db.currencies.find(c => c.id === id);
    setDb(prev => ({ ...prev, currencies: prev.currencies.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'CURRENCY', item.code, `Deleted currency ${item.code}`);
    }
  };

  // 5. Country
  const saveCountry = (country: Country) => {
    const isNew = !db.countries.some(c => c.id === country.id);
    setDb(prev => ({
      ...prev,
      countries: isNew ? [...prev.countries, country] : prev.countries.map(c => c.id === country.id ? country : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'COUNTRY',
      country.code,
      `${isNew ? 'Added country' : 'Updated country'} ${country.code} - ${country.nameEn}`
    );
  };

  const deleteCountry = (id: string) => {
    const item = db.countries.find(c => c.id === id);
    setDb(prev => ({ ...prev, countries: prev.countries.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'COUNTRY', item.code, `Deleted country ${item.code} (${item.nameEn})`);
    }
  };

  // 6. Exchange Rate
  const saveExchangeRate = (rate: ExchangeRate) => {
    const isNew = !db.exchangeRates.some(r => r.id === rate.id);
    setDb(prev => ({
      ...prev,
      exchangeRates: isNew ? [...prev.exchangeRates, rate] : prev.exchangeRates.map(r => r.id === rate.id ? rate : r)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'EXCHANGE_RATE',
      `${rate.fromCurrency}/${rate.toCurrency}`,
      `${isNew ? 'Set new' : 'Updated'} exchange rate ${rate.fromCurrency}/${rate.toCurrency} -> Transfer Rate: ${rate.transferRate} MMK (Buy: ${rate.buyRate} / Sell: ${rate.sellRate})`
    );
  };

  const deleteExchangeRate = (id: string) => {
    const item = db.exchangeRates.find(r => r.id === id);
    setDb(prev => ({ ...prev, exchangeRates: prev.exchangeRates.filter(r => r.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'EXCHANGE_RATE', `${item.fromCurrency}/${item.toCurrency}`, `Deleted exchange rate for ${item.fromCurrency}/${item.toCurrency}`);
    }
  };

  // 7. Blacklist (with Myanmar NRC & Passbook note text box)
  const saveBlacklist = (entry: BlacklistEntry) => {
    const isNew = !db.blacklist.some(b => b.id === entry.id);
    setDb(prev => ({
      ...prev,
      blacklist: isNew ? [...prev.blacklist, entry] : prev.blacklist.map(b => b.id === entry.id ? entry : b)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'BLACKLIST',
      entry.nrcNumber || entry.id,
      `${isNew ? 'Added to Blacklist' : 'Updated Blacklist target'}: ${entry.fullNameEn} (NRC: ${entry.nrcNumber}, Passbook: ${entry.passbookNumber}, Risk: ${entry.riskLevel}). Note: ${entry.note}`
    );
  };

  const deleteBlacklist = (id: string) => {
    const item = db.blacklist.find(b => b.id === id);
    setDb(prev => ({ ...prev, blacklist: prev.blacklist.filter(b => b.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'BLACKLIST', item.nrcNumber || item.id, `Removed ${item.fullNameEn} (NRC: ${item.nrcNumber}) from Blacklist`);
    }
  };

  // 8. Purpose of Remit
  const savePurpose = (purpose: RemittancePurpose) => {
    const isNew = !db.purposes.some(p => p.id === purpose.id);
    setDb(prev => ({
      ...prev,
      purposes: isNew ? [...prev.purposes, purpose] : prev.purposes.map(p => p.id === purpose.id ? purpose : p)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'PURPOSE',
      purpose.code,
      `${isNew ? 'Added purpose' : 'Updated purpose'} ${purpose.code} - ${purpose.nameEn} (${purpose.category})`
    );
  };

  const deletePurpose = (id: string) => {
    const item = db.purposes.find(p => p.id === id);
    setDb(prev => ({ ...prev, purposes: prev.purposes.filter(p => p.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'PURPOSE', item.code, `Deleted remittance purpose ${item.code} (${item.nameEn})`);
    }
  };

  // 9. Customer
  const saveCustomer = (customer: Customer) => {
    const isNew = !db.customers.some(c => c.id === customer.id);
    setDb(prev => ({
      ...prev,
      customers: isNew ? [...prev.customers, customer] : prev.customers.map(c => c.id === customer.id ? customer : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'CUSTOMER',
      customer.customerCode,
      `${isNew ? 'Registered customer' : 'Updated customer'} ${customer.customerCode} - ${customer.fullNameEn} (NRC: ${customer.nrcNumber})`
    );
  };

  const deleteCustomer = (id: string) => {
    const item = db.customers.find(c => c.id === id);
    setDb(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'CUSTOMER', item.customerCode, `Deleted customer ${item.customerCode} (${item.fullNameEn})`);
    }
  };

  // Backup & Restore
  const exportBackupJson = (): string => {
    const backupData = {
      metadata: {
        app: 'Remittance Management System',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.fullName,
        recordsSummary: {
          branches: db.branches.length,
          users: db.users.length,
          companies: db.companies.length,
          currencies: db.currencies.length,
          countries: db.countries.length,
          exchangeRates: db.exchangeRates.length,
          blacklist: db.blacklist.length,
          purposes: db.purposes.length,
          customers: db.customers.length,
          transactions: db.transactions.length,
          auditLogs: db.auditLogs.length,
        }
      },
      data: db
    };
    
    logActionDirect(
      'BACKUP',
      'SYSTEM',
      `BACKUP-${Date.now()}`,
      `Exported full system JSON backup containing ${db.transactions.length} transactions and ${db.auditLogs.length} audit logs.`
    );

    return JSON.stringify(backupData, null, 2);
  };

  const restoreBackupJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      const dataToRestore: AppDatabase = parsed.data || parsed;

      if (!dataToRestore.branches || !dataToRestore.transactions || !dataToRestore.users) {
        throw new Error('Invalid backup file structure: missing essential collections.');
      }

      setDb(dataToRestore);
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(dataToRestore));

      logActionDirect(
        'RESTORE',
        'SYSTEM',
        `RESTORE-${Date.now()}`,
        `Successfully restored system database from JSON backup (${dataToRestore.transactions.length} transactions loaded).`
      );

      return true;
    } catch (err) {
      console.error('Restore error:', err);
      return false;
    }
  };

  const resetToDefaultData = () => {
    setDb(initialDatabase);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initialDatabase));
    logActionDirect(
      'RESTORE',
      'SYSTEM',
      `RESET-${Date.now()}`,
      `Reset system to default initial seed dataset.`
    );
  };

  // Supabase Sync
  const updateSupabaseConfig = (config: Partial<SupabaseConfig>) => {
    setDb(prev => {
      const updated = {
        ...prev,
        supabaseConfig: { ...prev.supabaseConfig, ...config }
      };
      resetSupabaseClient(updated.supabaseConfig);
      return updated;
    });
  };

  const syncDataToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase client is not configured. Please enter URL and Anon Key in Supabase Settings.' };
    }

    try {
      setDb(prev => ({
        ...prev,
        supabaseConfig: { ...prev.supabaseConfig, syncStatus: 'SYNCING' }
      }));

      const syncedTables: string[] = [];
      const failedTables: string[] = [];

      // 1. Branches
      try {
        const branchPayload = db.branches.map(b => ({
          id: b.id,
          code: b.code,
          name_en: b.nameEn,
          name_mm: b.nameMm,
          city: b.city,
          phone: b.phone,
          address: b.address,
          manager_name: b.managerName,
          status: b.status,
          created_at: b.createdAt,
        }));
        const { error: bErr } = await client.from('branches').upsert(branchPayload, { onConflict: 'id' });
        if (bErr) throw bErr;
        syncedTables.push(`Branches (${branchPayload.length})`);
      } catch (err: any) {
        failedTables.push(`branches: ${err.message}`);
      }

      // 2. Users
      try {
        const userPayload = db.users.map(u => ({
          id: u.id,
          username: u.username,
          full_name: u.fullName,
          email: u.email,
          password: u.password || 'password123',
          role: u.role,
          branch_id: u.branchId,
          phone: u.phone,
          status: u.status,
          last_login: u.lastLogin,
          created_at: u.createdAt,
        }));
        const { error: uErr } = await client.from('users').upsert(userPayload, { onConflict: 'id' });
        if (uErr) throw uErr;
        syncedTables.push(`Users (${userPayload.length})`);
      } catch (err: any) {
        failedTables.push(`users: ${err.message}`);
      }

      // 3. Companies
      try {
        const companyPayload = db.companies.map(c => ({
          id: c.id,
          code: c.code,
          name_en: c.nameEn,
          name_mm: c.nameMm,
          country_code: c.countryCode,
          type: c.type,
          swift_code: c.swiftCode,
          license_no: c.licenseNo,
          phone: c.phone,
          email: c.email,
          status: c.status,
          created_at: c.createdAt,
        }));
        const { error: cErr } = await client.from('companies').upsert(companyPayload, { onConflict: 'id' });
        if (cErr) throw cErr;
        syncedTables.push(`Companies (${companyPayload.length})`);
      } catch (err: any) {
        failedTables.push(`companies: ${err.message}`);
      }

      // 4. Currencies
      try {
        const curPayload = db.currencies.map(cu => ({
          id: cu.id,
          code: cu.code,
          name_en: cu.nameEn,
          name_mm: cu.nameMm,
          symbol: cu.symbol,
          is_base_currency: cu.isBaseCurrency,
          decimals: cu.decimals,
          status: cu.status,
        }));
        const { error: cuErr } = await client.from('currencies').upsert(curPayload, { onConflict: 'id' });
        if (cuErr) throw cuErr;
        syncedTables.push(`Currencies (${curPayload.length})`);
      } catch (err: any) {
        failedTables.push(`currencies: ${err.message}`);
      }

      // 5. Countries
      try {
        const countryPayload = db.countries.map(co => ({
          id: co.id,
          code: co.code,
          name_en: co.nameEn,
          name_mm: co.nameMm,
          dial_code: co.dialCode,
          flag_emoji: co.flagEmoji,
          currency_code: co.currencyCode,
          is_domestic: co.isDomestic,
          status: co.status,
        }));
        const { error: coErr } = await client.from('countries').upsert(countryPayload, { onConflict: 'id' });
        if (coErr) throw coErr;
        syncedTables.push(`Countries (${countryPayload.length})`);
      } catch (err: any) {
        failedTables.push(`countries: ${err.message}`);
      }

      // 6. Exchange Rates
      try {
        const ratePayload = db.exchangeRates.map(r => ({
          id: r.id,
          from_currency: r.fromCurrency,
          to_currency: r.toCurrency,
          buy_rate: r.buyRate,
          sell_rate: r.sellRate,
          transfer_rate: r.transferRate,
          effective_date: r.effectiveDate,
          effective_time: r.effectiveTime,
          updated_by: r.updatedBy,
          note: r.note,
        }));
        const { error: rErr } = await client.from('exchange_rates').upsert(ratePayload, { onConflict: 'id' });
        if (rErr) throw rErr;
        syncedTables.push(`Exchange Rates (${ratePayload.length})`);
      } catch (err: any) {
        failedTables.push(`exchange_rates: ${err.message}`);
      }

      // 7. Blacklist
      try {
        const blPayload = db.blacklist.map(bl => ({
          id: bl.id,
          full_name_en: bl.fullNameEn,
          full_name_mm: bl.fullNameMm,
          nrc_number: bl.nrcNumber,
          passbook_number: bl.passbookNumber,
          passport_number: bl.passportNumber,
          reason: bl.reason,
          note: bl.note,
          risk_level: bl.riskLevel,
          added_by: bl.addedBy,
          active: bl.active,
          created_at: bl.createdAt,
        }));
        const { error: blErr } = await client.from('blacklist').upsert(blPayload, { onConflict: 'id' });
        if (blErr) throw blErr;
        syncedTables.push(`Blacklist (${blPayload.length})`);
      } catch (err: any) {
        failedTables.push(`blacklist: ${err.message}`);
      }

      // 8. Purposes
      try {
        const pPayload = db.purposes.map(p => ({
          id: p.id,
          code: p.code,
          name_en: p.nameEn,
          name_mm: p.nameMm,
          category: p.category,
          requires_doc_proof: p.requiresDocProof,
          max_daily_limit_mmk: p.maxDailyLimitMmk,
        }));
        const { error: pErr } = await client.from('purposes').upsert(pPayload, { onConflict: 'id' });
        if (pErr) throw pErr;
        syncedTables.push(`Purposes (${pPayload.length})`);
      } catch (err: any) {
        failedTables.push(`purposes: ${err.message}`);
      }

      // 9. Customers
      try {
        const cuPayload = db.customers.map(c => ({
          id: c.id,
          customer_code: c.customerCode,
          full_name_en: c.fullNameEn,
          full_name_mm: c.fullNameMm,
          nrc_number: c.nrcNumber,
          passbook_number: c.passbookNumber,
          passport_number: c.passportNumber,
          phone: c.phone,
          address: c.address,
          customer_type: c.customerType,
          risk_rating: c.riskRating,
          total_transactions: c.totalTransactions,
          total_volume_mmk: c.totalVolumeMmk,
          notes: c.notes,
          created_at: c.createdAt,
        }));
        const { error: cErr } = await client.from('customers').upsert(cuPayload, { onConflict: 'id' });
        if (cErr) throw cErr;
        syncedTables.push(`Customers (${cuPayload.length})`);
      } catch (err: any) {
        failedTables.push(`customers: ${err.message}`);
      }

      // 10. Transactions
      try {
        const txPayload = db.transactions.map(t => ({
          id: t.id,
          transaction_no: t.transactionNo,
          mtcn: t.mtcn,
          type: t.type,
          scope: t.scope,
          status: t.status,
          sender_name: t.senderName,
          sender_name_mm: t.senderNameMm,
          sender_nrc: t.senderNrc,
          sender_passbook: t.senderPassbook,
          sender_passport: t.senderPassport,
          sender_phone: t.senderPhone,
          sender_address: t.senderAddress,
          sender_country_code: t.senderCountryCode,
          receiver_name: t.receiverName,
          receiver_name_mm: t.receiverNameMm,
          receiver_nrc: t.receiverNrc,
          receiver_passbook: t.receiverPassbook,
          receiver_passport: t.receiverPassport,
          receiver_phone: t.receiverPhone,
          receiver_address: t.receiverAddress,
          receiver_country_code: t.receiverCountryCode,
          source_currency: t.sourceCurrency,
          target_currency: t.targetCurrency,
          send_amount: t.sendAmount,
          exchange_rate: t.exchangeRate,
          receive_amount: t.receiveAmount,
          service_fee: t.serviceFee,
          commission_fee: t.commissionFee,
          tax_amount: t.taxAmount,
          total_payable_amount: t.totalPayableAmount,
          payout_method: t.payoutMethod,
          payout_bank_name: t.payoutBankName,
          payout_account_number: t.payoutAccountNumber,
          sending_branch_id: t.sendingBranchId,
          payout_branch_id: t.payoutBranchId,
          partner_company_id: t.partnerCompanyId,
          purpose_id: t.purposeId,
          purpose_name: t.purposeName,
          sender_note: t.senderNote,
          proof_document_name: t.proofDocumentName,
          blacklist_checked: t.blacklistChecked,
          blacklist_alert: t.blacklistAlert,
          creator_user_id: t.creatorUserId,
          creator_name: t.creatorName,
          approver_user_id: t.approverUserId,
          approver_name: t.approverName,
          approval_note: t.approvalNote,
          rejection_reason: t.rejectionReason,
          created_date: t.createdDate,
          approved_date: t.approvedDate,
          paid_out_date: t.paidOutDate,
        }));
        const { error: tErr } = await client.from('transactions').upsert(txPayload, { onConflict: 'id' });
        if (tErr) throw tErr;
        syncedTables.push(`Transactions (${txPayload.length})`);
      } catch (err: any) {
        failedTables.push(`transactions: ${err.message}`);
      }

      // 11. Audit Logs
      try {
        const auditPayload = db.auditLogs.slice(0, 500).map(a => ({
          id: a.id,
          timestamp: a.timestamp,
          user_id: a.userId,
          user_name: a.userName,
          user_role: a.userRole,
          action: a.action,
          entity_type: a.entityType,
          entity_id: a.entityId,
          details: a.details,
          previous_value: a.previousValue,
          new_value: a.newValue,
        }));
        const { error: aErr } = await client.from('audit_logs').upsert(auditPayload, { onConflict: 'id' });
        if (aErr) throw aErr;
        syncedTables.push(`Audit Logs (${auditPayload.length})`);
      } catch (err: any) {
        failedTables.push(`audit_logs: ${err.message}`);
      }

      const now = new Date().toISOString();

      if (syncedTables.length > 0) {
        setDb(prev => ({
          ...prev,
          supabaseConfig: {
            ...prev.supabaseConfig,
            isConnected: true,
            syncStatus: failedTables.length > 0 ? 'ERROR' : 'SUCCESS',
            lastSyncTime: now,
            errorMessage: failedTables.length > 0 ? failedTables.join('; ') : undefined,
          }
        }));

        logActionDirect(
          'SYNC',
          'SYSTEM',
          'SUPABASE-SYNC',
          `Synced ${syncedTables.length} tables to Supabase. ${failedTables.length ? `(Pending: ${failedTables.join(', ')})` : ''}`
        );

        if (failedTables.length === 0) {
          return {
            success: true,
            message: `အားလုံး အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ! (All ${syncedTables.length} tables synchronized to Supabase PostgreSQL: ${syncedTables.join(', ')})`
          };
        } else {
          return {
            success: true,
            message: `Synchronized ${syncedTables.length} tables successfully. Notice for ${failedTables.length} tables: ${failedTables[0]}`
          };
        }
      } else {
        throw new Error(failedTables.join('; ') || 'No tables could be synchronized.');
      }
    } catch (err: any) {
      setDb(prev => ({
        ...prev,
        supabaseConfig: {
          ...prev.supabaseConfig,
          syncStatus: 'ERROR',
          errorMessage: err.message
        }
      }));
      return { success: false, message: `Sync failed: ${err.message || 'Make sure Supabase tables are created and RLS is disabled.'}` };
    }
  };

  const fetchDataFromSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase client is not configured.' };
    }

    try {
      setDb(prev => ({
        ...prev,
        supabaseConfig: { ...prev.supabaseConfig, syncStatus: 'SYNCING' }
      }));

      // Pull branches
      const { data: remoteBranches, error: bErr } = await client.from('branches').select('*');
      if (bErr) throw bErr;

      // Pull transactions
      const { data: remoteTxs } = await client.from('transactions').select('*');

      let updatedCount = 0;
      setDb(prev => {
        let updatedBranches = prev.branches;
        let updatedTxs = prev.transactions;

        if (remoteBranches && remoteBranches.length > 0) {
          updatedBranches = remoteBranches.map(b => ({
            id: b.id,
            code: b.code,
            nameEn: b.name_en,
            nameMm: b.name_mm,
            city: b.city,
            phone: b.phone,
            address: b.address,
            managerName: b.manager_name,
            status: b.status || 'ACTIVE',
            createdAt: b.created_at || new Date().toISOString(),
          }));
          updatedCount += updatedBranches.length;
        }

        if (remoteTxs && remoteTxs.length > 0) {
          updatedTxs = remoteTxs.map(t => ({
            id: t.id,
            transactionNo: t.transaction_no,
            mtcn: t.mtcn,
            type: t.type,
            scope: t.scope,
            status: t.status,
            senderName: t.sender_name,
            senderNameMm: t.sender_name_mm,
            senderNrc: t.sender_nrc,
            senderPassbook: t.sender_passbook,
            senderPassport: t.sender_passport,
            senderPhone: t.sender_phone,
            senderAddress: t.sender_address,
            senderCountryCode: t.sender_country_code,
            receiverName: t.receiver_name,
            receiverNameMm: t.receiver_name_mm,
            receiverNrc: t.receiver_nrc,
            receiverPassbook: t.receiver_passbook,
            receiverPassport: t.receiver_passport,
            receiverPhone: t.receiver_phone,
            receiverAddress: t.receiver_address,
            receiverCountryCode: t.receiver_country_code,
            sourceCurrency: t.source_currency,
            targetCurrency: t.target_currency,
            sendAmount: Number(t.send_amount),
            exchangeRate: Number(t.exchange_rate),
            receiveAmount: Number(t.receive_amount),
            serviceFee: Number(t.service_fee || 0),
            commissionFee: Number(t.commission_fee || 0),
            taxAmount: Number(t.tax_amount || 0),
            totalPayableAmount: Number(t.total_payable_amount),
            payoutMethod: t.payout_method,
            payoutBankName: t.payout_bank_name,
            payoutAccountNumber: t.payout_account_number,
            sendingBranchId: t.sending_branch_id,
            payoutBranchId: t.payout_branch_id,
            partnerCompanyId: t.partner_company_id,
            purposeId: t.purpose_id,
            purposeName: t.purpose_name,
            senderNote: t.sender_note,
            proofDocumentName: t.proof_document_name,
            blacklistChecked: Boolean(t.blacklist_checked),
            blacklistAlert: t.blacklist_alert,
            creatorUserId: t.creator_user_id,
            creatorName: t.creator_name,
            approverUserId: t.approver_user_id,
            approverName: t.approver_name,
            approvalNote: t.approval_note,
            rejectionReason: t.rejection_reason,
            createdDate: t.created_date,
            approvedDate: t.approved_date,
            paidOutDate: t.paid_out_date,
          }));
          updatedCount += updatedTxs.length;
        }

        return {
          ...prev,
          branches: updatedBranches,
          transactions: updatedTxs,
          supabaseConfig: {
            ...prev.supabaseConfig,
            isConnected: true,
            syncStatus: 'SUCCESS',
            lastSyncTime: new Date().toISOString()
          }
        };
      });

      logActionDirect('SYNC', 'SYSTEM', 'SUPABASE-PULL', `Pulled ${updatedCount} remote records from Supabase`);
      return { success: true, message: `Successfully fetched and refreshed data from Supabase (${updatedCount} records retrieved).` };
    } catch (err: any) {
      setDb(prev => ({
        ...prev,
        supabaseConfig: {
          ...prev.supabaseConfig,
          syncStatus: 'ERROR',
          errorMessage: err.message
        }
      }));
      return { success: false, message: `Fetch failed: ${err.message}` };
    }
  };

  // --------------------------------------------------------------------------
  // Supabase User Authentication Handlers
  // --------------------------------------------------------------------------
  const loginWithSupabase = async (
    usernameOrEmail: string,
    password?: string
  ): Promise<{
    success: boolean;
    message: string;
    user?: User;
    isRlsBlocked?: boolean;
    isTableMissing?: boolean;
    needsConfig?: boolean;
  }> => {
    const trimmed = (usernameOrEmail || '').trim();
    const trimmedPass = (password || '').trim();

    if (!trimmed) {
      return {
        success: false,
        message: language === 'my' 
          ? 'ကျေးဇူးပြု၍ Username သို့မဟုတ် Email ထည့်သွင်းပါ' 
          : 'Please enter your Username or Email'
      };
    }

    const client = getSupabaseClient(db.supabaseConfig);
    if (!client || !db.supabaseConfig.url || !db.supabaseConfig.anonKey) {
      return {
        success: false,
        needsConfig: true,
        message: language === 'my'
          ? 'Supabase Database ချိတ်ဆက်မှု မရှိသေးပါ။ ကျေးဇူးပြု၍ Supabase URL နှင့် Anon Key ကို ထည့်သွင်းပေးပါခင်ဗျာ။'
          : 'Supabase is not configured yet. Please configure your Supabase Project URL and Anon Key.'
      };
    }

    try {
      // 1. Query Supabase users table by username (case-insensitive)
      let { data: remoteUsers, error } = await client
        .from('users')
        .select('*')
        .ilike('username', trimmed);

      // If not found by username, try by email
      if (!error && (!remoteUsers || remoteUsers.length === 0)) {
        const emailRes = await client
          .from('users')
          .select('*')
          .ilike('email', trimmed);
        remoteUsers = emailRes.data;
        error = emailRes.error;
      }

      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            isTableMissing: true,
            message: language === 'my'
              ? 'Supabase တွင် "users" table မရှိသေးပါ။ ကျေးဇူးပြု၍ Supabase SQL Editor တွင် Table DDL script ကို run ပေးပါခင်ဗျာ။'
              : 'Table "users" does not exist in Supabase yet. Please execute the SQL DDL script in Supabase SQL Editor.'
          };
        }
        if (error.code === '42501' || error.message?.toLowerCase().includes('permission denied')) {
          return {
            success: false,
            isRlsBlocked: true,
            message: language === 'my'
              ? 'Supabase RLS (Row-Level Security) ပိတ်ထား၍ ဖတ်မရပါ။ ကျေးဇူးပြု၍ RLS Disable Script ကို Supabase SQL Editor တွင် Run ပေးပါခင်ဗျာ။'
              : 'Supabase Row-Level Security (RLS) is blocking access. Please run the Disable RLS SQL script in Supabase.'
          };
        }
        return {
          success: false,
          message: `Supabase Error: ${error.message}`
        };
      }

      if (!remoteUsers || remoteUsers.length === 0) {
        return {
          success: false,
          message: language === 'my'
            ? `Supabase user table တွင် "${trimmed}" အသုံးပြုသူ အကောင့် မတွေ့ရှိပါ`
            : `No user found in Supabase "users" table matching "${trimmed}"`
        };
      }

      const found = remoteUsers[0];

      // Check account status
      if (found.status && found.status.toUpperCase() === 'INACTIVE') {
        return {
          success: false,
          message: language === 'my'
            ? 'ဤအသုံးပြုသူအကောင့်ကို ပိတ်ထားပါသည် (Account is Inactive)'
            : 'This user account is currently deactivated.'
        };
      }

      // Check password if provided in Supabase table
      if (found.password && found.password.trim() !== '') {
        if (trimmedPass && found.password !== trimmedPass) {
          return {
            success: false,
            message: language === 'my'
              ? 'လျှို့ဝှက်နံပါတ် (Password) မှားယွင်းနေပါသည်'
              : 'Incorrect password entered.'
          };
        }
      }

      // Map remote user to User interface
      const authenticatedUser: User = {
        id: found.id,
        username: found.username,
        fullName: found.full_name,
        email: found.email,
        role: found.role as UserRole,
        branchId: found.branch_id || 'BR-001',
        phone: found.phone || '',
        status: found.status || 'ACTIVE',
        lastLogin: new Date().toISOString(),
        createdAt: found.created_at || new Date().toISOString(),
        password: found.password,
      };

      // Update last_login in Supabase asynchronously
      try {
        await client
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authenticatedUser.id);
      } catch (ignore) {}

      // Upsert into local state & set active user
      setDb(prev => {
        const userExists = prev.users.some(u => u.id === authenticatedUser.id);
        const updatedUsers = userExists
          ? prev.users.map(u => u.id === authenticatedUser.id ? authenticatedUser : u)
          : [...prev.users, authenticatedUser];

        return {
          ...prev,
          users: updatedUsers,
          currentUserId: authenticatedUser.id,
          supabaseConfig: {
            ...prev.supabaseConfig,
            isConnected: true,
          }
        };
      });

      // Save session in sessionStorage
      try {
        sessionStorage.setItem('REMITTANCE_AUTH_SESSION', JSON.stringify({
          userId: authenticatedUser.id,
          username: authenticatedUser.username,
          role: authenticatedUser.role,
          fullName: authenticatedUser.fullName,
          loginAt: new Date().toISOString(),
        }));
      } catch (e) {
        console.error(e);
      }

      setIsAuthenticated(true);

      logActionDirect(
        'LOGIN',
        'USER',
        authenticatedUser.username,
        `User ${authenticatedUser.fullName} (${authenticatedUser.role}) logged in successfully via Supabase user table`
      );

      return {
        success: true,
        message: language === 'my'
          ? `ကြိုဆိုပါသည် ${authenticatedUser.fullName}! Supabase user table မှ အောင်မြင်စွာ login ဝင်ရောက်ပြီးပါပြီ။`
          : `Welcome, ${authenticatedUser.fullName}! Successfully authenticated with Supabase user table.`,
        user: authenticatedUser
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Login failed due to unexpected error.'
      };
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem('REMITTANCE_AUTH_SESSION');
    } catch (e) {}
    setIsAuthenticated(false);
    logActionDirect('LOGIN', 'SYSTEM', currentUser.id, `User ${currentUser.fullName} logged out`);
  };

  const fetchSupabaseUsers = async (): Promise<{ success: boolean; users?: User[]; message?: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase client is not configured' };
    }
    try {
      const { data, error } = await client.from('users').select('*').order('username', { ascending: true });
      if (error) throw error;
      if (data) {
        const mapped: User[] = data.map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          email: u.email,
          role: u.role as UserRole,
          branchId: u.branch_id || 'BR-001',
          phone: u.phone || '',
          status: u.status || 'ACTIVE',
          lastLogin: u.last_login,
          createdAt: u.created_at,
          password: u.password,
        }));
        return { success: true, users: mapped };
      }
      return { success: true, users: [] };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to fetch users from Supabase' };
    }
  };

  const seedUsersToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase is not configured' };
    }
    try {
      const userPayload = db.users.map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.fullName,
        email: u.email,
        password: u.password || 'password123',
        role: u.role,
        branch_id: u.branchId,
        phone: u.phone,
        status: u.status,
        last_login: u.lastLogin,
        created_at: u.createdAt,
      }));
      const { error } = await client.from('users').upsert(userPayload, { onConflict: 'id' });
      if (error) throw error;
      return {
        success: true,
        message: `Successfully uploaded ${userPayload.length} users to Supabase users table.`
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to seed users to Supabase' };
    }
  };

  return (
    <RemittanceContext.Provider
      value={{
        db,
        language,
        t,
        setLanguage,
        currentUser,
        switchUser,
        checkBlacklist,
        createOutwardRemittance,
        createInwardRemittance,
        approveTransaction,
        rejectTransaction,
        holdTransaction,
        payoutInwardTransaction,
        lookupTransactionByMtcn,
        saveBranch,
        deleteBranch,
        saveUser,
        deleteUser,
        saveCompany,
        deleteCompany,
        saveCurrency,
        deleteCurrency,
        saveCountry,
        deleteCountry,
        saveExchangeRate,
        deleteExchangeRate,
        getExchangeRate,
        saveBlacklist,
        deleteBlacklist,
        savePurpose,
        deletePurpose,
        saveCustomer,
        deleteCustomer,
        logAction,
        exportBackupJson,
        exportDatabaseJson: exportBackupJson,
        restoreBackupJson,
        restoreDatabaseFromJson: restoreBackupJson,
        resetToDefaultData,
        resetToDefaultSeed: resetToDefaultData,
        updateSupabaseConfig,
        syncDataToSupabase,
        fetchDataFromSupabase,
        isAuthenticated,
        loginWithSupabase,
        logout,
        fetchSupabaseUsers,
        seedUsersToSupabase,
      }}
    >
      {children}
    </RemittanceContext.Provider>
  );
};

export const useRemittance = () => {
  const context = useContext(RemittanceContext);
  if (!context) {
    throw new Error('useRemittance must be used within a RemittanceProvider');
  }
  return context;
};
