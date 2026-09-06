import React, { useState, useEffect } from 'react';
import { 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  Calculator, 
  UserCheck2, 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Upload,
  User,
  Paperclip,
  MapPin,
  Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceScope, PayoutMethod, RemittanceTransaction, BlacklistEntry } from '../../types';
import { VoucherModal } from '../VoucherModal';

export const OutwardEntryView: React.FC = () => {
  const { db, language, t, checkBlacklist, getExchangeRate, createOutwardRemittance, currentUser } = useRemittance();

  // Form State
  const [scope, setScope] = useState<RemittanceScope>('INTERNATIONAL');
  
  // Sender
  const [senderName, setSenderName] = useState('');
  const [senderNameMm, setSenderNameMm] = useState('');
  const [senderNrc, setSenderNrc] = useState('');
  const [senderPassport, setSenderPassport] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCountryCode, setSenderCountryCode] = useState('MM');

  // Receiver
  const [receiverName, setReceiverName] = useState('');
  const [receiverNameMm, setReceiverNameMm] = useState('');
  const [receiverNrc, setReceiverNrc] = useState('');
  const [receiverPassport, setReceiverPassport] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCountryCode, setReceiverCountryCode] = useState('TH');

  // Financials
  const [sourceCurrency, setSourceCurrency] = useState('MMK');
  const [targetCurrency, setTargetCurrency] = useState('THB');
  const [sendAmount, setSendAmount] = useState<number>(5000000);
  const [exchangeRate, setExchangeRate] = useState<number>(134.50);
  const [serviceFee, setServiceFee] = useState<number>(15000);
  const [commissionFee, setCommissionFee] = useState<number>(5000);
  
  // Method & Purpose
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('CASH_PICKUP');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [purposeId, setPurposeId] = useState('PUR-001');
  const [partnerCompanyId, setPartnerCompanyId] = useState('CMP-005');
  const [sendingBranchId, setSendingBranchId] = useState(currentUser.branchId || 'BR-001');
  const [senderNote, setSenderNote] = useState('');
  const [proofDocumentName, setProofDocumentName] = useState('');

  // Compliance Screening Matches
  const [senderMatch, setSenderMatch] = useState<BlacklistEntry | null>(null);
  const [receiverMatch, setReceiverMatch] = useState<BlacklistEntry | null>(null);

  // Submission & Voucher preview
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<RemittanceTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Recalculate exchange rate when currencies change
  useEffect(() => {
    const rate = getExchangeRate(targetCurrency, sourceCurrency);
    setExchangeRate(rate);
  }, [sourceCurrency, targetCurrency, getExchangeRate]);

  // Adjust default country when scope changes
  useEffect(() => {
    if (scope === 'DOMESTIC') {
      setReceiverCountryCode('MM');
      setTargetCurrency('MMK');
      setSourceCurrency('MMK');
      setExchangeRate(1);
    } else {
      if (receiverCountryCode === 'MM') {
        setReceiverCountryCode('TH');
        setTargetCurrency('THB');
      }
    }
  }, [scope]);

  // Real-time screening on sender NRC / Passport / Name
  useEffect(() => {
    const match = checkBlacklist(senderNrc, senderPassport, senderName);
    setSenderMatch(match);
  }, [senderNrc, senderPassport, senderName, checkBlacklist]);

  // Real-time screening on receiver NRC / Passport / Name
  useEffect(() => {
    const match = checkBlacklist(receiverNrc, receiverPassport, receiverName);
    setReceiverMatch(match);
  }, [receiverNrc, receiverPassport, receiverName, checkBlacklist]);

  // Calculations
  const calculatedReceiveAmount = sourceCurrency === 'MMK' && targetCurrency !== 'MMK'
    ? (exchangeRate > 0 ? Number((sendAmount / exchangeRate).toFixed(2)) : 0)
    : Number((sendAmount * exchangeRate).toFixed(2));

  const totalPayableAmount = Number(sendAmount) + Number(serviceFee) + Number(commissionFee);

  // Quick fill customer data
  const handleSelectSenderCustomer = (customerId: string) => {
    const cust = db.customers.find(c => c.id === customerId);
    if (cust) {
      setSenderName(cust.fullNameEn);
      setSenderNameMm(cust.fullNameMm || '');
      setSenderNrc(cust.nrcNumber);
      setSenderPassport(cust.passportNumber || cust.passbookNumber || '');
      setSenderPhone(cust.phone);
      setSenderAddress(cust.address);
    }
  };

  const handleSelectReceiverCustomer = (customerId: string) => {
    const cust = db.customers.find(c => c.id === customerId);
    if (cust) {
      setReceiverName(cust.fullNameEn);
      setReceiverNameMm(cust.fullNameMm || '');
      setReceiverNrc(cust.nrcNumber);
      setReceiverPassport(cust.passportNumber || cust.passbookNumber || '');
      setReceiverPhone(cust.phone);
      setReceiverAddress(cust.address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!senderName || !senderPhone) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲပို့သူ အမည်နှင့် ဖုန်းနံပါတ် ဖြည့်စွက်ပါ' : 'Please fill in Sender Name and Phone');
      return;
    }

    if (!receiverName || !receiverPhone) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲလက်ခံသူ အမည်နှင့် ဖုန်းနံပါတ် ဖြည့်စွက်ပါ' : 'Please fill in Receiver Name and Phone');
      return;
    }

    if (sendAmount <= 0) {
      setErrorMessage(language === 'my' ? 'လွှဲပို့ငွေပမာဏ သုညထက် ကြီးရပါမည်' : 'Send amount must be greater than zero');
      return;
    }

    // Hard block if Blacklist Critical
    if (senderMatch && senderMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေလွှဲပို့သူသည် နာမည်ပျက်စာရင်း (${senderMatch.reason}) တွင် ပါဝင်နေသဖြင့် တားမြစ်ထားပါသည်` 
          : `Sender is flagged on CRITICAL Blacklist (${senderMatch.reason}). Submission blocked.`
      );
      return;
    }

    if (receiverMatch && receiverMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေလွှဲလက်ခံသူသည် နာမည်ပျက်စာရင်း (${receiverMatch.reason}) တွင် ပါဝင်နေသဖြင့် တားမြစ်ထားပါသည်` 
          : `Receiver is flagged on CRITICAL Blacklist (${receiverMatch.reason}). Submission blocked.`
      );
      return;
    }

    const selectedPurpose = db.purposes.find(p => p.id === purposeId);

    setIsSubmitting(true);
    try {
      const newTx = await createOutwardRemittance({
        scope,
        senderName,
        senderNameMm,
        senderNrc,
        senderPassport: senderPassport || undefined,
        senderPassbook: senderPassport || undefined,
        senderPhone,
        senderAddress,
        senderCountryCode,
        receiverName,
        receiverNameMm,
        receiverNrc,
        receiverPassport: receiverPassport || undefined,
        receiverPassbook: receiverPassport || undefined,
        receiverPhone,
        receiverAddress,
        receiverCountryCode,
        sourceCurrency,
        targetCurrency,
        sendAmount: Number(sendAmount),
        exchangeRate: Number(exchangeRate),
        receiveAmount: Number(calculatedReceiveAmount),
        serviceFee: Number(serviceFee),
        commissionFee: Number(commissionFee),
        totalPayableAmount: Number(totalPayableAmount),
        payoutMethod,
        payoutBankName,
        payoutAccountNumber,
        sendingBranchId,
        partnerCompanyId,
        purposeId,
        purposeName: selectedPurpose ? (language === 'my' ? selectedPurpose.nameMm : selectedPurpose.nameEn) : 'General',
        senderNote,
        proofDocumentName: proofDocumentName || 'Deposit_Receipt_Auto.pdf',
        status: 'PENDING_APPROVAL',
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setCreatedTx(newTx);

      // Reset form
      setSendAmount(5000000);
      setSenderNote('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit remittance transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Scope selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t.outwardEntryTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.outwardEntrySubtitle}
            </p>
          </div>

          {/* Scope Switch & Active Branch Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>{language === 'my' ? 'ဆောင်ရွက်သည့် ဘဏ်ခွဲ' : 'Sending Branch'}: </span>
              <strong className="text-white font-semibold">
                {db.branches.find(b => b.id === sendingBranchId)?.nameEn || 'Yangon HQ'} ({db.branches.find(b => b.id === sendingBranchId)?.code || sendingBranchId})
              </strong>
            </div>

            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setScope('INTERNATIONAL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scope === 'INTERNATIONAL'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.international}
              </button>
              <button
                type="button"
                onClick={() => setScope('DOMESTIC')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scope === 'DOMESTIC'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.domestic}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-500 text-rose-200 rounded-xl p-4 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-rose-300 block">{t.warning}:</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Blacklist Critical Warnings if triggered */}
      {(senderMatch || receiverMatch) && (
        <div className="bg-rose-950/90 border-2 border-rose-500 text-white rounded-2xl p-5 shadow-2xl space-y-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider text-rose-300">
              {t.blacklistWarningTitle}
            </h3>
          </div>
          
          {senderMatch && (
            <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-700 text-xs space-y-1">
              <strong className="text-rose-200 font-bold block">
                🚨 Sender Match: {senderMatch.fullNameEn} ({senderMatch.fullNameMm})
              </strong>
              <div className="text-slate-300">
                <span>NRC: </span><span className="font-mono text-white">{senderMatch.nrcNumber}</span> | 
                <span> Passport: </span><span className="font-mono text-white">{senderMatch.passportNumber || senderMatch.passbookNumber || '-'}</span> | 
                <span> Risk: </span><span className="font-bold text-rose-400">{senderMatch.riskLevel}</span>
              </div>
              <div className="text-rose-200 italic mt-1 bg-black/30 p-2 rounded">
                Note: "{senderMatch.note}"
              </div>
            </div>
          )}

          {receiverMatch && (
            <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-700 text-xs space-y-1">
              <strong className="text-rose-200 font-bold block">
                🚨 Receiver Match: {receiverMatch.fullNameEn} ({receiverMatch.fullNameMm})
              </strong>
              <div className="text-slate-300">
                <span>NRC: </span><span className="font-mono text-white">{receiverMatch.nrcNumber}</span> | 
                <span> Passport: </span><span className="font-mono text-white">{receiverMatch.passportNumber || receiverMatch.passbookNumber || '-'}</span>
              </div>
              <div className="text-rose-200 italic mt-1 bg-black/30 p-2 rounded">
                Note: "{receiverMatch.note}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 & 2: Sender & Receiver Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SENDER CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t.senderInformation}
                </h3>
              </div>
              {/* Quick Customer Picker */}
              <select
                onChange={(e) => handleSelectSenderCustomer(e.target.value)}
                className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>{language === 'my' ? '-- ဖောက်သည် အမြန်ရွေးရန် --' : '-- Quick Load Customer --'}</option>
                {db.customers.map(c => (
                  <option key={c.id} value={c.id}>{c.fullNameEn} ({c.nrcNumber})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderName} *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. U Zaw Win Htet"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderNameMm}</label>
                <input
                  type="text"
                  value={senderNameMm}
                  onChange={(e) => setSenderNameMm(e.target.value)}
                  placeholder="e.g. ဦးဇော်ဝင်းထက်"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {t.senderNrc} {senderMatch ? <span className="text-rose-400 font-bold">(FLAGGED)</span> : <span className="text-emerald-400">✓</span>}
                </label>
                <input
                  type="text"
                  value={senderNrc}
                  onChange={(e) => setSenderNrc(e.target.value)}
                  placeholder="12/BAHANA(N)184920"
                  className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                    senderMatch ? 'border-rose-500 bg-rose-950/30' : 'border-slate-700 focus:border-sky-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderPassbook}</label>
                <input
                  type="text"
                  value={senderPassport}
                  onChange={(e) => setSenderPassport(e.target.value)}
                  placeholder="MB-102948 or Passport No"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderPhone} *</label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="09-420019283"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderCountry}</label>
                <select
                  value={senderCountryCode}
                  onChange={(e) => setSenderCountryCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                >
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">{t.senderAddress}</label>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="No. 45, Kabar Aye Pagoda Road, Bahan, Yangon"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* RECEIVER CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <UserCheck2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t.receiverInformation}
                </h3>
              </div>
              <select
                onChange={(e) => handleSelectReceiverCustomer(e.target.value)}
                className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>{language === 'my' ? '-- ဖောက်သည် အမြန်ရွေးရန် --' : '-- Quick Load Customer --'}</option>
                {db.customers.map(c => (
                  <option key={c.id} value={c.id}>{c.fullNameEn} ({c.nrcNumber})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverName} *</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Somchai Prasert / Ma Su Myat"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverNameMm}</label>
                <input
                  type="text"
                  value={receiverNameMm}
                  onChange={(e) => setReceiverNameMm(e.target.value)}
                  placeholder="e.g. မဆုမြတ်ထက်"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {t.receiverNrc} {receiverMatch ? <span className="text-rose-400 font-bold">(FLAGGED)</span> : ''}
                </label>
                <input
                  type="text"
                  value={receiverNrc}
                  onChange={(e) => setReceiverNrc(e.target.value)}
                  placeholder="12/BAHANA(N)291840 or Foreign ID"
                  className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                    receiverMatch ? 'border-rose-500 bg-rose-950/30' : 'border-slate-700 focus:border-sky-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverPassbook}</label>
                <input
                  type="text"
                  value={receiverPassport}
                  onChange={(e) => setReceiverPassport(e.target.value)}
                  placeholder="Passport No / ID"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverPhone} *</label>
                <input
                  type="text"
                  required
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="+66-89-123-9988"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverCountry}</label>
                <select
                  value={receiverCountryCode}
                  onChange={(e) => {
                    setReceiverCountryCode(e.target.value);
                    const country = db.countries.find(c => c.code === e.target.value);
                    if (country && country.currencyCode) {
                      setTargetCurrency(country.currencyCode);
                    }
                  }}
                  disabled={scope === 'DOMESTIC'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none disabled:opacity-60"
                >
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">{t.receiverAddress}</label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  placeholder="Pratunam Market, Ratchathewi, Bangkok, Thailand"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Financials, Exchange Rate & Settlement */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.financialDetails}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Rate ID: LIVE-{sourceCurrency}/{targetCurrency}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Source Currency */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.sourceCurrency}</label>
              <select
                value={sourceCurrency}
                onChange={(e) => setSourceCurrency(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-sky-500 focus:outline-none"
              >
                {db.currencies.map(c => (
                  <option key={c.id} value={c.code}>{c.code} - {language === 'my' ? c.nameMm : c.nameEn}</option>
                ))}
              </select>
            </div>

            {/* Target Currency */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.targetCurrency}</label>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                disabled={scope === 'DOMESTIC'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-sky-500 focus:outline-none disabled:opacity-60"
              >
                {db.currencies.map(c => (
                  <option key={c.id} value={c.code}>{c.code} - {language === 'my' ? c.nameMm : c.nameEn}</option>
                ))}
              </select>
            </div>

            {/* Send Amount */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.sendAmount} *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">{sourceCurrency}</span>
              </div>
            </div>

            {/* Exchange Rate */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.exchangeRate}</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">MMK</span>
              </div>
            </div>
          </div>

          {/* Real-time calculated Result Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border-r border-slate-800 pr-4">
              <span className="text-slate-400 text-xs block">{t.receiveAmount} (လက်ခံရရှိငွေ)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                {calculatedReceiveAmount.toLocaleString()} {targetCurrency}
              </span>
            </div>

            <div className="border-r border-slate-800 pr-4">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>{t.serviceFee}:</span>
                <span className="font-mono text-white">{serviceFee.toLocaleString()} MMK</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                <span>{t.commissionFee}:</span>
                <span className="font-mono text-white">{commissionFee.toLocaleString()} MMK</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-xs block">{t.totalPayable} (စုစုပေါင်းပေးချေငွေ)</span>
              <span className="text-xl font-black text-white font-mono mt-1 block">
                {totalPayableAmount.toLocaleString()} {sourceCurrency}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Purpose, Method, Bank Partner & Attachment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-800">
            {language === 'my' ? 'ငွေလွှဲရည်ရွယ်ချက် နှင့် ထုတ်ပေးမည့် ပုံစံ' : 'Purpose & Routing Details'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Sending Branch */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                {language === 'my' ? 'ဆောင်ရွက်သည့် ဘဏ်ခွဲ (Sending Branch)' : 'Sending Branch'} *
              </label>
              <select
                value={sendingBranchId}
                onChange={(e) => setSendingBranchId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none font-medium"
              >
                {db.branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.nameEn} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.purposeOfRemit} *</label>
              <select
                value={purposeId}
                onChange={(e) => setPurposeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                {db.purposes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {language === 'my' ? p.nameMm : p.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Payout Method */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.payoutMethod}</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="CASH_PICKUP">{t.cashPickup}</option>
                <option value="BANK_ACCOUNT">{t.bankAccount}</option>
                <option value="MOBILE_WALLET">{t.mobileWallet}</option>
              </select>
            </div>

            {/* Partner Company / Bank */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.partnerCompany}</label>
              <select
                value={partnerCompanyId}
                onChange={(e) => setPartnerCompanyId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                {db.companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {language === 'my' ? c.nameMm : c.nameEn} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">{t.noteOrRemarks}</label>
              <input
                type="text"
                value={senderNote}
                onChange={(e) => setSenderNote(e.target.value)}
                placeholder="e.g. Overseas education fee payment NUS Fall Semester"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Proof Attachment */}
            <div className="sm:col-span-3">
              <label className="block text-slate-400 mb-1 font-medium">{t.attachProof}</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={proofDocumentName}
                  onChange={(e) => setProofDocumentName(e.target.value)}
                  placeholder="Deposit_Receipt_0902.pdf"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setProofDocumentName(`NRC_Proof_${Date.now().toString().slice(-4)}.pdf`)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300"
                  title="Simulate file attach"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Branch Information Banner */}
          {(() => {
            const curBranch = db.branches.find(b => b.id === sendingBranchId) || db.branches[0];
            if (!curBranch) return null;
            return (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">
                        {language === 'my' && curBranch.nameMm ? `${curBranch.nameMm} (${curBranch.nameEn})` : curBranch.nameEn}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono text-[10px] font-bold">
                        {curBranch.code}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        {curBranch.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs mt-1.5">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-500" />
                        <span>{curBranch.address}, {curBranch.city}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-sky-500" />
                        <span className="font-mono text-slate-300 font-semibold">{curBranch.phone}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 sm:border-l border-slate-800 sm:pl-4">
                  <span className="text-slate-500 block text-[11px]">{language === 'my' ? 'ဘဏ်ခွဲ မန်နေဂျာ' : 'Branch Manager'}</span>
                  <span className="font-bold text-slate-200">{curBranch.managerName}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Submit & Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : t.submitForApproval}</span>
          </button>
        </div>
      </form>

      {/* Generated Voucher Modal upon creation */}
      <VoucherModal
        isOpen={!!createdTx}
        transaction={createdTx}
        onClose={() => setCreatedTx(null)}
      />
    </div>
  );
};
