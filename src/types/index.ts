export type Language = 'en' | 'my';

export type UserRole = 'ADMIN' | 'MAKER' | 'CHECKER' | 'AUDITOR';

export type RemittanceType = 'OUTWARD' | 'INWARD';

export type RemittanceScope = 'DOMESTIC' | 'INTERNATIONAL';

export type RemittanceStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'PAID_OUT' 
  | 'ON_HOLD'
  | 'CANCELLED';

export type PayoutMethod = 'CASH_PICKUP' | 'BANK_ACCOUNT' | 'MOBILE_WALLET';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Branch {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  city: string;
  phone: string;
  address: string;
  managerName: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  branchId: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
  createdAt: string;
  password?: string;
}

export interface Company {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  countryCode: string;
  type: 'BANK' | 'AGENT' | 'FINTECH' | 'MONEY_CHANGER';
  swiftCode?: string;
  licenseNo: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Currency {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  symbol: string;
  isBaseCurrency: boolean;
  decimals: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Country {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  dialCode: string;
  flagEmoji: string;
  currencyCode: string;
  isDomestic: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  buyRate: number;
  sellRate: number;
  transferRate: number; // Remittance special rate
  effectiveDate: string; // YYYY-MM-DD
  effectiveTime: string;
  updatedBy: string;
  note?: string;
}

export interface BlacklistEntry {
  id: string;
  fullNameEn: string;
  fullNameMm: string;
  nrcNumber: string; // Myanmar NRC e.g. 12/LKN(N)123456
  passbookNumber: string; // Bank account or passbook
  passportNumber?: string;
  reason: string;
  note: string; // Detail note text box requested by user
  riskLevel: RiskLevel;
  addedBy: string;
  active: boolean;
  createdAt: string;
}

export interface RemittancePurpose {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  category: 'PERSONAL' | 'BUSINESS' | 'EDUCATION' | 'MEDICAL' | 'SALARY' | 'OTHER';
  requiresDocProof: boolean;
  maxDailyLimitMMK?: number;
}

export interface Customer {
  id: string;
  customerCode: string;
  fullNameEn: string;
  fullNameMm: string;
  nrcNumber: string;
  passbookNumber: string;
  passportNumber?: string;
  phone: string;
  address: string;
  customerType: 'SENDER' | 'RECEIVER' | 'BOTH';
  riskRating: RiskLevel;
  totalTransactions: number;
  totalVolumeMMK: number;
  notes?: string;
  createdAt: string;
}

export interface RemittanceTransaction {
  id: string;
  transactionNo: string; // e.g. REM-OUT-20260902-001
  mtcn: string; // 10-digit Money Transfer Control Number
  type: RemittanceType;
  scope: RemittanceScope;
  status: RemittanceStatus;
  
  // Sender
  senderName: string;
  senderNameMm?: string;
  senderNrc: string;
  senderPassbook?: string;
  senderPassport?: string;
  senderPhone: string;
  senderAddress: string;
  senderCountryCode: string;
  
  // Receiver
  receiverName: string;
  receiverNameMm?: string;
  receiverNrc: string;
  receiverPassbook?: string;
  receiverPassport?: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCountryCode: string;
  
  // Financials
  sourceCurrency: string;
  targetCurrency: string;
  sendAmount: number;
  exchangeRate: number;
  receiveAmount: number;
  serviceFee: number;
  commissionFee: number;
  taxAmount: number;
  totalPayableAmount: number;
  
  // Processing info
  payoutMethod: PayoutMethod;
  payoutBankName?: string;
  payoutAccountNumber?: string;
  
  sendingBranchId: string;
  payoutBranchId?: string;
  partnerCompanyId?: string;
  
  purposeId: string;
  purposeName: string;
  senderNote?: string;
  proofDocumentName?: string;
  
  // Security & Screening
  blacklistChecked: boolean;
  blacklistAlert?: string;
  
  // Maker-Checker
  creatorUserId: string;
  creatorName: string;
  approverUserId?: string;
  approverName?: string;
  approvalNote?: string;
  rejectionReason?: string;
  
  createdDate: string; // ISO string
  approvedDate?: string;
  paidOutDate?: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'HOLD' | 'PAYOUT' | 'LOGIN' | 'EXPORT' | 'BACKUP' | 'RESTORE' | 'SYNC' | 'SCREENING';
  entityType: 'OUTWARD' | 'INWARD' | 'BRANCH' | 'USER' | 'COMPANY' | 'CURRENCY' | 'COUNTRY' | 'EXCHANGE_RATE' | 'BLACKLIST' | 'PURPOSE' | 'CUSTOMER' | 'SYSTEM';
  entityId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncTime?: string;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  autoSync: boolean;
}

export interface AppDatabase {
  branches: Branch[];
  users: User[];
  companies: Company[];
  currencies: Currency[];
  countries: Country[];
  exchangeRates: ExchangeRate[];
  blacklist: BlacklistEntry[];
  purposes: RemittancePurpose[];
  customers: Customer[];
  transactions: RemittanceTransaction[];
  auditLogs: AuditRecord[];
  supabaseConfig: SupabaseConfig;
  activeLanguage: Language;
  currentUserId: string;
}
