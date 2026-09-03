import React, { useState, useMemo, useEffect } from 'react';
import { 
  DownloadCloud, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Coins, 
  Building2, 
  User, 
  UserCheck2, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  QrCode,
  FileText,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Building
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction, PayoutMethod, BlacklistEntry, Company } from '../../types';
import { VoucherModal } from '../VoucherModal';

export const InwardEntryView: React.FC = () => {
  const { 
    db, 
    language, 
    t, 
    lookupTransactionByMtcn, 
    checkBlacklist, 
    getExchangeRate, 
    createInwardRemittance, 
    currentUser,
    saveCompany,
    deleteCompany
  } = useRemittance();

  // Search MTCN
  const [searchMtcn, setSearchMtcn] = useState('');
  const [lookupMessage, setLookupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [mtcn, setMtcn] = useState('');
  
  // Beneficiary / Receiver in Myanmar
  const [receiverName, setReceiverName] = useState('');
  const [receiverNameMm, setReceiverNameMm] = useState('');
  const [receiverNrc, setReceiverNrc] = useState('');
  const [receiverPassbook, setReceiverPassbook] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [isManualNrc, setIsManualNrc] = useState(false);
  const [isManualPassbook, setIsManualPassbook] = useState(false);
  
  // Origin Sender
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCountryCode, setSenderCountryCode] = useState('TH');
  
  // Financials
  const [sourceCurrency, setSourceCurrency] = useState('THB');
  const [targetCurrency, setTargetCurrency] = useState('MMK');
  const [sendAmount, setSendAmount] = useState<number>(30000);
  const [exchangeRate, setExchangeRate] = useState<number>(134.50);
  
  // Routing
  const [partnerCompanyId, setPartnerCompanyId] = useState('CMP-005');
  const [payoutBranchId, setPayoutBranchId] = useState(currentUser.branchId || 'BR-001');
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('CASH_PICKUP');
  const [payoutBankName, setPayoutBankName] = useState('KBZ Bank Ltd');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [purposeId, setPurposeId] = useState('PUR-004');
  const [senderNote, setSenderNote] = useState('');

  // Partner Management Modal
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isNewPartner, setIsNewPartner] = useState(true);
  const [editingPartner, setEditingPartner] = useState<Partial<Company>>({});
  const [partnerDeleteConfirmId, setPartnerDeleteConfirmId] = useState<string | null>(null);

  // Screening
  const [receiverMatch, setReceiverMatch] = useState<BlacklistEntry | null>(null);
  const [senderMatch, setSenderMatch] = useState<BlacklistEntry | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<RemittanceTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Consolidated beneficiary/customer list for Dropdown selection
  const beneficiaryOptions = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nrc: string;
      passbook: string;
      nameEn: string;
      nameMm: string;
      phone: string;
      address: string;
    }>();

    // From registered customers
    db.customers.forEach(c => {
      if (c.nrcNumber) {
        map.set(c.nrcNumber, {
          id: c.id,
          nrc: c.nrcNumber,
          passbook: c.passbookNumber || '',
          nameEn: c.fullNameEn,
          nameMm: c.fullNameMm || '',
          phone: c.phone || '',
          address: c.address || '',
        });
      }
    });

    // From previous transactions
    db.transactions.forEach(t => {
      if (t.receiverNrc && !map.has(t.receiverNrc) && !t.receiverNrc.includes('Foreign')) {
        map.set(t.receiverNrc, {
          id: `BEN-${t.receiverNrc}`,
          nrc: t.receiverNrc,
          passbook: t.receiverPassbook || '',
          nameEn: t.receiverName,
          nameMm: t.receiverNameMm || '',
          phone: t.receiverPhone || '',
          address: t.receiverAddress || '',
        });
      }
    });

    return Array.from(map.values());
  }, [db.customers, db.transactions]);

  // Beneficiary selection handlers
  const handleSelectNrc = (nrcVal: string) => {
    if (nrcVal === '__NEW_NRC__') {
      setIsManualNrc(true);
      setReceiverNrc('');
      return;
    }
    setReceiverNrc(nrcVal);
    const found = beneficiaryOptions.find(b => b.nrc === nrcVal);
    if (found) {
      if (found.passbook) setReceiverPassbook(found.passbook);
      if (found.nameEn) setReceiverName(found.nameEn);
      if (found.nameMm) setReceiverNameMm(found.nameMm);
      if (found.phone) setReceiverPhone(found.phone);
      if (found.address) setReceiverAddress(found.address);
    }
  };

  const handleSelectPassbook = (passVal: string) => {
    if (passVal === '__NEW_PASSBOOK__') {
      setIsManualPassbook(true);
      setReceiverPassbook('');
      return;
    }
    setReceiverPassbook(passVal);
    const found = beneficiaryOptions.find(b => b.passbook === passVal);
    if (found) {
      if (found.nrc) setReceiverNrc(found.nrc);
      if (found.nameEn) setReceiverName(found.nameEn);
      if (found.nameMm) setReceiverNameMm(found.nameMm);
      if (found.phone) setReceiverPhone(found.phone);
      if (found.address) setReceiverAddress(found.address);
    }
  };

  // Partner CRUD Handlers
  const handleOpenAddPartner = () => {
    setIsNewPartner(true);
    setEditingPartner({
      id: `CMP-${Date.now()}`,
      code: `CMP-00${db.companies.length + 1}`,
      nameEn: '',
      nameMm: '',
      countryCode: senderCountryCode || 'TH',
      type: 'AGENT',
      swiftCode: '',
      licenseNo: `LIC-${Date.now().toString().slice(-4)}`,
      phone: '+66-',
      email: '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });
    setIsPartnerModalOpen(true);
  };

  const handleOpenEditPartner = () => {
    const existing = db.companies.find(c => c.id === partnerCompanyId);
    if (!existing) return;
    setIsNewPartner(false);
    setEditingPartner({ ...existing });
    setIsPartnerModalOpen(true);
  };

  const handleDeletePartner = () => {
    if (!partnerCompanyId) return;
    deleteCompany(partnerCompanyId);
    const remaining = db.companies.filter(c => c.id !== partnerCompanyId);
    if (remaining.length > 0) {
      setPartnerCompanyId(remaining[0].id);
    } else {
      setPartnerCompanyId('');
    }
    setPartnerDeleteConfirmId(null);
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner.nameEn) return;
    const toSave: Company = {
      id: editingPartner.id || `CMP-${Date.now()}`,
      code: editingPartner.code || `CMP-00${db.companies.length + 1}`,
      nameEn: editingPartner.nameEn,
      nameMm: editingPartner.nameMm || editingPartner.nameEn,
      countryCode: editingPartner.countryCode || senderCountryCode || 'TH',
      type: (editingPartner.type as any) || 'AGENT',
      swiftCode: editingPartner.swiftCode || '',
      licenseNo: editingPartner.licenseNo || `LIC-${Date.now().toString().slice(-4)}`,
      phone: editingPartner.phone || '',
      email: editingPartner.email || '',
      status: editingPartner.status || 'ACTIVE',
      createdAt: editingPartner.createdAt || new Date().toISOString(),
    };
    saveCompany(toSave);
    setPartnerCompanyId(toSave.id);
    setIsPartnerModalOpen(false);
  };

  // Handle MTCN Lookup
  const handleLookup = () => {
    setLookupMessage(null);
    if (!searchMtcn.trim()) return;

    const found = lookupTransactionByMtcn(searchMtcn);
    if (found) {
      setLookupMessage({
        type: 'success',
        text: language === 'my' 
          ? `MTCN ${found.mtcn} ကို ရှာဖွေတွေ့ရှိပါသည်! အချက်အလက်များ အလိုအလျောက် ဖြည့်သွင်းပြီးပါပြီ။` 
          : `MTCN ${found.mtcn} found in system! Details loaded.`
      });
      setMtcn(found.mtcn);
      setSenderName(found.senderName);
      setSenderPhone(found.senderPhone);
      setSenderAddress(found.senderAddress);
      setSenderCountryCode(found.senderCountryCode);
      setReceiverName(found.receiverName);
      setReceiverNameMm(found.receiverNameMm || '');
      setReceiverNrc(found.receiverNrc);
      setReceiverPassbook(found.receiverPassbook || '');
      setReceiverPhone(found.receiverPhone);
      setReceiverAddress(found.receiverAddress);
      setSourceCurrency(found.sourceCurrency);
      setSendAmount(found.sendAmount);
      setExchangeRate(found.exchangeRate);
      setPayoutMethod(found.payoutMethod);
      if (found.partnerCompanyId) setPartnerCompanyId(found.partnerCompanyId);
    } else {
      setLookupMessage({
        type: 'error',
        text: language === 'my' 
          ? `MTCN (${searchMtcn}) မတွေ့ရှိပါ။ ပြည်ပမိတ်ဖက်လိုင်းသစ်အဖြစ် လက်ဖြင့် စာရင်းသွင်းနိုင်ပါသည်။` 
          : `MTCN (${searchMtcn}) not in local database. You can manually enter partner inbound remittance claim.`
      });
      setMtcn(searchMtcn.trim());
    }
  };

  // Real-time screening
  React.useEffect(() => {
    const match = checkBlacklist(receiverNrc, receiverPassbook, receiverName);
    setReceiverMatch(match);
  }, [receiverNrc, receiverPassbook, receiverName, checkBlacklist]);

  React.useEffect(() => {
    const match = checkBlacklist('', '', senderName);
    setSenderMatch(match);
  }, [senderName, checkBlacklist]);

  // Recalculate exchange rate
  React.useEffect(() => {
    if (sourceCurrency !== 'MMK') {
      const rate = getExchangeRate(sourceCurrency, 'MMK');
      setExchangeRate(rate);
    }
  }, [sourceCurrency, getExchangeRate]);

  const calculatedPayoutMMK = Number((sendAmount * exchangeRate).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!receiverName || !receiverPhone || !receiverNrc) {
      setErrorMessage(language === 'my' ? 'ငွေထုတ်ယူသူ၏ အမည်၊ ဖုန်းနံပါတ် နှင့် မှတ်ပုံတင် ထည့်သွင်းပါ' : 'Beneficiary Name, Phone, and NRC are required');
      return;
    }

    if (receiverMatch && receiverMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေထုတ်ယူသူသည် နာမည်ပျက်စာရင်း (${receiverMatch.reason}) တွင် ပါဝင်နေသဖြင့် ငွေထုတ်ပေးခွင့် ပိတ်ထားပါသည်` 
          : `Beneficiary is on CRITICAL Blacklist (${receiverMatch.reason}). Payout blocked.`
      );
      return;
    }

    const selectedPurpose = db.purposes.find(p => p.id === purposeId);

    setIsSubmitting(true);
    try {
      const newTx = await createInwardRemittance({
        mtcn: mtcn || undefined,
        scope: 'INTERNATIONAL',
        senderName: senderName || 'Overseas Remitter',
        senderPhone: senderPhone || '+66-00-000-000',
        senderAddress: senderAddress || 'Overseas',
        senderCountryCode,
        receiverName,
        receiverNameMm,
        receiverNrc,
        receiverPassbook,
        receiverPhone,
        receiverAddress,
        receiverCountryCode: 'MM',
        sourceCurrency,
        targetCurrency: 'MMK',
        sendAmount: Number(sendAmount),
        exchangeRate: Number(exchangeRate),
        receiveAmount: Number(calculatedPayoutMMK),
        serviceFee: 0,
        commissionFee: 0,
        totalPayableAmount: Number(calculatedPayoutMMK),
        payoutMethod,
        payoutBankName: payoutMethod === 'BANK_ACCOUNT' ? payoutBankName : undefined,
        payoutAccountNumber: payoutMethod === 'BANK_ACCOUNT' ? payoutAccountNumber : undefined,
        payoutBranchId,
        partnerCompanyId,
        purposeId,
        purposeName: selectedPurpose ? (language === 'my' ? selectedPurpose.nameMm : selectedPurpose.nameEn) : 'Labor Remittance',
        senderNote,
        status: 'PENDING_APPROVAL',
      });

      confetti({ particleCount: 70, spread: 60 });
      setCreatedTx(newTx);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit inward remittance claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <DownloadCloud className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.inwardEntryTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.inwardEntrySubtitle}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span>{t.payoutBranch}: </span>
          <strong className="text-white font-semibold">
            {db.branches.find(b => b.id === payoutBranchId)?.nameEn || 'Yangon HQ'} ({db.branches.find(b => b.id === payoutBranchId)?.code || payoutBranchId})
          </strong>
        </div>
      </div>

      {/* MTCN Lookup Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          {t.lookupMtcn}
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchMtcn}
              onChange={(e) => setSearchMtcn(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder={t.searchMtcnPlaceholder}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={handleLookup}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors"
          >
            {t.lookupBtn}
          </button>
        </div>

        {lookupMessage && (
          <div className={`p-3 rounded-xl text-xs font-medium ${
            lookupMessage.type === 'success' 
              ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300' 
              : 'bg-amber-950/60 border border-amber-500 text-amber-300'
          }`}>
            {lookupMessage.text}
          </div>
        )}
      </div>

      {/* Blacklist Warning */}
      {receiverMatch && (
        <div className="bg-rose-950 border-2 border-rose-500 rounded-2xl p-5 text-white shadow-xl space-y-2 animate-pulse">
          <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>{t.blacklistWarningTitle}</span>
          </div>
          <div className="text-xs text-rose-200">
            <strong>Beneficiary Matched: </strong> {receiverMatch.fullNameEn} ({receiverMatch.nrcNumber}) - {receiverMatch.reason}
          </div>
          <div className="text-xs italic bg-black/40 p-2 rounded text-rose-300">
            Note: "{receiverMatch.note}"
          </div>
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Beneficiary Receiver Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <UserCheck2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {language === 'my' ? 'ငွေထုတ်ယူမည့် ဖောက်သည် အချက်အလက်' : 'Beneficiary / Receiver Details'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverName} *</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Ko Aung Kyaw Moe"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverNameMm}</label>
                <input
                  type="text"
                  value={receiverNameMm}
                  onChange={(e) => setReceiverNameMm(e.target.value)}
                  placeholder="e.g. ကိုအောင်ကျော်မိုး"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Beneficiary Myanmar NRC - Dropdown List with Manual Entry option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-medium">
                    {t.beneficiaryNrc} * {receiverMatch ? <span className="text-rose-400 font-bold">(BLACKLIST MATCH)</span> : ''}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualNrc(!isManualNrc);
                      if (!isManualNrc) setReceiverNrc('');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-normal transition-colors"
                  >
                    {isManualNrc 
                      ? (language === 'my' ? '← စာရင်းမှ ရွေးမည်' : '← Select from List') 
                      : (language === 'my' ? '+ အသစ်ရိုက်မည်' : '+ Enter Manual')}
                  </button>
                </div>

                {isManualNrc ? (
                  <input
                    type="text"
                    required
                    value={receiverNrc}
                    onChange={(e) => setReceiverNrc(e.target.value)}
                    placeholder="12/DAGANA(N)019482"
                    className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                      receiverMatch ? 'border-rose-500 bg-rose-950/30 text-rose-200' : 'border-slate-700 focus:border-indigo-500'
                    }`}
                  />
                ) : (
                  <select
                    required
                    value={receiverNrc}
                    onChange={(e) => handleSelectNrc(e.target.value)}
                    className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono focus:outline-none ${
                      receiverMatch ? 'border-rose-500 bg-rose-950/30 text-rose-200' : 'border-slate-700 focus:border-indigo-500'
                    }`}
                  >
                    <option value="">
                      -- {language === 'my' ? 'မှတ်ပုံတင် ရွေးချယ်ပါ (Select Beneficiary NRC)' : 'Select Beneficiary NRC'} --
                    </option>
                    {beneficiaryOptions.map(b => (
                      <option key={b.nrc} value={b.nrc}>
                        {b.nrc} — {b.nameEn} {b.nameMm ? `(${b.nameMm})` : ''}
                      </option>
                    ))}
                    <option value="__NEW_NRC__">
                      + {language === 'my' ? 'အသစ်ရိုက်ထည့်မည် (Enter Custom NRC)...' : 'Enter Custom NRC...'}
                    </option>
                  </select>
                )}
              </div>

              {/* Passbook / Account No - Dropdown List with Manual Entry option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-medium">
                    {t.beneficiaryPassbook}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualPassbook(!isManualPassbook);
                      if (!isManualPassbook) setReceiverPassbook('');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-normal transition-colors"
                  >
                    {isManualPassbook 
                      ? (language === 'my' ? '← စာရင်းမှ ရွေးမည်' : '← Select from List') 
                      : (language === 'my' ? '+ အသစ်ရိုက်မည်' : '+ Enter Manual')}
                  </button>
                </div>

                {isManualPassbook ? (
                  <input
                    type="text"
                    value={receiverPassbook}
                    onChange={(e) => setReceiverPassbook(e.target.value)}
                    placeholder="109-291-8472910"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                ) : (
                  <select
                    value={receiverPassbook}
                    onChange={(e) => handleSelectPassbook(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">
                      -- {language === 'my' ? 'ဘဏ်စာအုပ်/အကောင့် ရွေးချယ်ပါ' : 'Select Passbook / Account'} --
                    </option>
                    {beneficiaryOptions.filter(b => b.passbook).map(b => (
                      <option key={b.passbook} value={b.passbook}>
                        {b.passbook} — {b.nameEn} {b.nameMm ? `(${b.nameMm})` : ''}
                      </option>
                    ))}
                    <option value="__NEW_PASSBOOK__">
                      + {language === 'my' ? 'အသစ်ရိုက်ထည့်မည် (Enter Custom Account)...' : 'Enter Custom Account...'}
                    </option>
                  </select>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverPhone} *</label>
                <input
                  type="text"
                  required
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="09-974820194"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverAddress}</label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  placeholder="Room 402, Building 8, South Dagon, Yangon"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sender & Origin Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <User className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {language === 'my' ? 'ပြည်ပ လွှဲပို့သူ နှင့် မိတ်ဖက်အဖွဲ့အစည်း' : 'Overseas Sender & Partner'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderName}</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. U Min Hein Thu"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderCountry}</label>
                <select
                  value={senderCountryCode}
                  onChange={(e) => {
                    setSenderCountryCode(e.target.value);
                    const country = db.countries.find(c => c.code === e.target.value);
                    if (country && country.currencyCode) setSourceCurrency(country.currencyCode);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {db.countries.filter(c => !c.isDomestic).map(c => (
                    <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                  ))}
                </select>
              </div>

              {/* Partner Bank / Agent with Add New, Edit, Delete */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-medium">
                    {t.partnerCompany} *
                  </label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={handleOpenAddPartner}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      title={language === 'my' ? 'မိတ်ဖက်အသစ် ထည့်သွင်းမည်' : 'Add New Partner Bank/Agent'}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{language === 'my' ? 'အသစ်ထည့်' : 'Add New'}</span>
                    </button>
                    {partnerCompanyId && (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenEditPartner}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                          title={language === 'my' ? 'လက်ရှိမိတ်ဖက် ပြင်ဆင်မည်' : 'Edit Selected Partner'}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{language === 'my' ? 'ပြင်မည်' : 'Edit'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPartnerDeleteConfirmId(partnerCompanyId)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950 hover:bg-rose-900 border border-rose-700/50 text-rose-300 transition-colors"
                          title={language === 'my' ? 'လက်ရှိမိတ်ဖက် ဖျက်ပစ်မည်' : 'Delete Selected Partner'}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{language === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <select
                  value={partnerCompanyId}
                  onChange={(e) => setPartnerCompanyId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {db.companies.map(c => {
                    const country = db.countries.find(cty => cty.code === c.countryCode);
                    return (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.nameEn} ({country?.flagEmoji || '🌐'} {c.type} - {c.countryCode})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Partner Delete Confirmation alert if active */}
              {partnerDeleteConfirmId && (
                <div className="sm:col-span-2 p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-rose-200 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>
                      {language === 'my' 
                        ? `ဤမိတ်ဖက် (${db.companies.find(c => c.id === partnerDeleteConfirmId)?.nameEn}) ကို ဖျက်ရန် သေချာပါသလား?` 
                        : `Delete partner (${db.companies.find(c => c.id === partnerDeleteConfirmId)?.nameEn})?`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleDeletePartner}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition-colors"
                    >
                      {language === 'my' ? 'သေချာသည် ဖျက်မည်' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartnerDeleteConfirmId(null)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
                    >
                      {language === 'my' ? 'မဖျက်တော့ပါ' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Branch Selection in Overseas Sender & Partner */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {language === 'my' ? 'ဆောင်ရွက်မည့် ဘဏ်ခွဲ (Branch)' : 'Processing / Payout Branch'} *
                </label>
                <select
                  value={payoutBranchId}
                  onChange={(e) => setPayoutBranchId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-medium"
                >
                  {db.branches.map(b => {
                    const country = db.countries.find(c => c.code === (b.countryCode || 'MM'));
                    return (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.nameEn} ({country?.flagEmoji || '🇲🇲'} {b.city})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.purposeOfRemit}</label>
                <select
                  value={purposeId}
                  onChange={(e) => setPurposeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {db.purposes.map(p => (
                    <option key={p.id} value={p.id}>{p.nameEn}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">{t.senderPhone}</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+60-11-2948-1928"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financials & Payout Methods */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {t.financialDetails} & Payout Method
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.sourceCurrency}</label>
              <select
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
              >
                {db.currencies.map(c => (
                  <option key={c.id} value={c.code}>{c.code} - {c.nameEn}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.sendAmount}</label>
              <input
                type="number"
                min="1"
                step="any"
                value={sendAmount}
                onChange={(e) => setSendAmount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.exchangeRate}</label>
              <input
                type="number"
                step="any"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.payoutMethod}</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="CASH_PICKUP">{t.cashPickup}</option>
                <option value="BANK_ACCOUNT">{t.bankAccount}</option>
                <option value="MOBILE_WALLET">{t.mobileWallet}</option>
              </select>
            </div>
          </div>

          {/* Grand Payout Box */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase">
                {language === 'my' ? 'ငွေထုတ်ယူသူသို့ ပေးချေရမည့် မြန်မာကျပ်ငွေ ပမာဏ' : 'Total Beneficiary Payout (MMK)'}
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                {calculatedPayoutMMK.toLocaleString()} <span className="text-sm font-bold">MMK</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : t.submitInwardApproval}
            </button>
          </div>
        </div>
      </form>

      {/* Generated Voucher Modal */}
      <VoucherModal
        isOpen={!!createdTx}
        transaction={createdTx}
        onClose={() => setCreatedTx(null)}
      />

      {/* Partner Bank / Agent Add & Edit Modal */}
      {isPartnerModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs overflow-y-auto flex justify-center items-start sm:items-center p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPartnerModalOpen(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">
                  {isNewPartner 
                    ? (language === 'my' ? 'မိတ်ဖက်ဘဏ် / အေဂျင်စီ အသစ်ထည့်မည်' : 'Add New Partner Bank / Agent')
                    : (language === 'my' ? 'မိတ်ဖက်ဘဏ် / အေဂျင်စီ ပြင်ဆင်မည်' : 'Edit Partner Bank / Agent')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Company Code *</label>
                  <input
                    type="text"
                    required
                    value={editingPartner.code || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, code: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {language === 'my' ? 'နိုင်ငံ (Country) *' : 'Country *'}
                  </label>
                  <select
                    value={editingPartner.countryCode || 'TH'}
                    onChange={(e) => setEditingPartner({ ...editingPartner, countryCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                  >
                    {db.countries.map(c => (
                      <option key={c.id} value={c.code}>
                        {c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Partner Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={editingPartner.nameEn || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, nameEn: e.target.value })}
                  placeholder="e.g. Western Union Thailand"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Partner Name (Myanmar)
                </label>
                <input
                  type="text"
                  value={editingPartner.nameMm || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, nameMm: e.target.value })}
                  placeholder="e.g. ဝက်စတန်ယူနီယံ ထိုင်း"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Entity Type</label>
                  <select
                    value={editingPartner.type || 'AGENT'}
                    onChange={(e) => setEditingPartner({ ...editingPartner, type: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                  >
                    <option value="BANK">BANK (ဘဏ်)</option>
                    <option value="AGENT">AGENT (အေဂျင်စီ)</option>
                    <option value="FINTECH">FINTECH (ဖင်တက်)</option>
                    <option value="MONEY_CHANGER">MONEY CHANGER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    value={editingPartner.swiftCode || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, swiftCode: e.target.value })}
                    placeholder="e.g. BKKBTHBK"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">License / Reg No</label>
                  <input
                    type="text"
                    value={editingPartner.licenseNo || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, licenseNo: e.target.value })}
                    placeholder="BOT-FX-2026-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingPartner.phone || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })}
                    placeholder="+66-2-123-4567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{language === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Partner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
