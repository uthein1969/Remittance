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
  restoreBackupJson: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
  
  // Supabase
  updateSupabaseConfig: (config: Partial<SupabaseConfig>) => void;
  syncDataToSupabase: () => Promise<{ success: boolean; message: string }>;
  fetchDataFromSupabase: () => Promise<{ success: boolean; message: string }>;
}

const RemittanceContext = createContext<RemittanceContextType | null>(null);

export const RemittanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => {
    try {
      const saved = localStorage.getItem(DB_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.branches && parsed.users && parsed.transactions) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load local DB state:', err);
    }
    return initialDatabase;
  });

  // Save to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }, [db]);

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

      // Upsert branches
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
      }));
      await client.from('branches').upsert(branchPayload, { onConflict: 'id' });

      // Upsert transactions
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
        sender_phone: t.senderPhone,
        sender_address: t.senderAddress,
        sender_country_code: t.senderCountryCode,
        receiver_name: t.receiverName,
        receiver_name_mm: t.receiverNameMm,
        receiver_nrc: t.receiverNrc,
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
        total_payable_amount: t.totalPayableAmount,
        payout_method: t.payoutMethod,
        sending_branch_id: t.sendingBranchId,
        purpose_id: t.purposeId,
        purpose_name: t.purposeName,
        creator_user_id: t.creatorUserId,
        creator_name: t.creatorName,
      }));
      await client.from('transactions').upsert(txPayload, { onConflict: 'id' });

      const now = new Date().toISOString();
      setDb(prev => ({
        ...prev,
        supabaseConfig: {
          ...prev.supabaseConfig,
          isConnected: true,
          syncStatus: 'SUCCESS',
          lastSyncTime: now
        }
      }));

      logActionDirect('SYNC', 'SYSTEM', 'SUPABASE-SYNC', 'Pushed local database state to Supabase PostgreSQL');
      return { success: true, message: 'All local records successfully synchronized to Supabase PostgreSQL database.' };
    } catch (err: any) {
      setDb(prev => ({
        ...prev,
        supabaseConfig: {
          ...prev.supabaseConfig,
          syncStatus: 'ERROR',
          errorMessage: err.message
        }
      }));
      return { success: false, message: `Sync failed: ${err.message || 'Make sure Supabase tables are created.'}` };
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

      const { data: remoteBranches, error: bErr } = await client.from('branches').select('*');
      if (bErr) throw bErr;

      if (remoteBranches && remoteBranches.length > 0) {
        const mappedBranches: Branch[] = remoteBranches.map(b => ({
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

        setDb(prev => ({
          ...prev,
          branches: mappedBranches,
          supabaseConfig: {
            ...prev.supabaseConfig,
            isConnected: true,
            syncStatus: 'SUCCESS',
            lastSyncTime: new Date().toISOString()
          }
        }));
      }

      logActionDirect('SYNC', 'SYSTEM', 'SUPABASE-PULL', 'Pulled updated remote records from Supabase');
      return { success: true, message: 'Successfully fetched and refreshed data from Supabase.' };
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
        restoreBackupJson,
        resetToDefaultData,
        updateSupabaseConfig,
        syncDataToSupabase,
        fetchDataFromSupabase,
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
