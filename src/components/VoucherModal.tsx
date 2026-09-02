import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Copy, 
  QrCode, 
  Building2, 
  ShieldCheck,
  ArrowRight,
  Download
} from 'lucide-react';
import { RemittanceTransaction } from '../types';
import { useRemittance } from '../lib/store';

interface VoucherModalProps {
  transaction: RemittanceTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ transaction, isOpen, onClose }) => {
  const { db, language, t } = useRemittance();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !transaction) return null;

  const branch = db.branches.find(b => b.id === transaction.sendingBranchId) || db.branches[0];
  const partner = db.companies.find(c => c.id === transaction.partnerCompanyId);

  const copyMtcn = () => {
    navigator.clipboard.writeText(transaction.mtcn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Top Header bar with Action buttons */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold">
              {language === 'my' ? 'တရားဝင် ငွေလွှဲပြေစာ (Official Remittance Voucher)' : 'Official Remittance Voucher & Receipt'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'my' ? 'ပြေစာ ပုံနှိပ်မည် (Print)' : 'Print Voucher'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-8 space-y-6 print:p-4" id="printable-voucher">
          {/* Header & Logo */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-sm">
                  RMS
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    Remittance Management System
                  </h2>
                  <p className="text-xs font-semibold text-slate-600">
                    {language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲလုပ်ငန်း ဝန်ဆောင်မှု' : 'Domestic & International Money Transfer Services'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {language === 'my' ? `${branch.nameMm} (${branch.nameEn})` : branch.nameEn} • {branch.phone} • {branch.address}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg border border-slate-300 text-xs font-bold text-slate-800">
                {transaction.type === 'OUTWARD' 
                  ? (language === 'my' ? 'ငွေလွှဲပို့ ပြေစာ (OUTWARD)' : 'OUTWARD REMITTANCE SLIP') 
                  : (language === 'my' ? 'ငွေလွှဲထုတ် ပြေစာ (INWARD)' : 'INWARD PAYOUT VOUCHER')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {language === 'my' ? 'နေ့စွဲ' : 'Date'}: {new Date(transaction.createdDate).toLocaleString()}
              </div>
              <div className="text-xs font-mono font-bold text-slate-700">
                Ref: {transaction.transactionNo}
              </div>
            </div>
          </div>

          {/* MTCN Golden Banner */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                {language === 'my' ? 'ငွေလွှဲ လျှို့ဝှက်ကုဒ် / MTCN' : 'Money Transfer Control Number (MTCN)'}
              </span>
              <div className="flex items-center space-x-3 mt-0.5">
                <span className="text-2xl sm:text-3xl font-mono font-black text-amber-950 tracking-widest">
                  {transaction.mtcn}
                </span>
                <button
                  onClick={copyMtcn}
                  className="p-1.5 rounded-md hover:bg-amber-200/60 text-amber-900 transition-colors no-print"
                  title="Copy MTCN"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copied && <span className="text-xs font-bold text-emerald-700 no-print">{language === 'my' ? 'ကူးယူပြီး!' : 'Copied!'}</span>}
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500 block">
                  {language === 'my' ? 'အခြေအနေ' : 'Status'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                  transaction.status === 'APPROVED' || transaction.status === 'PAID_OUT'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : transaction.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {transaction.status}
                </span>
              </div>
              <div className="w-12 h-12 bg-white border border-slate-300 rounded flex items-center justify-center p-1">
                <QrCode className="w-full h-full text-slate-800" />
              </div>
            </div>
          </div>

          {/* Sender & Receiver 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sender */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                {language === 'my' ? 'ငွေလွှဲပို့သူ အချက်အလက် (Sender)' : 'Sender Information'}
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500 block">{language === 'my' ? 'အမည်' : 'Name'}:</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {language === 'my' 
                      ? `${transaction.senderNameMm || transaction.senderName} (${transaction.senderName})`
                      : transaction.senderName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>{' '}
                  <strong className="font-mono text-slate-800">{transaction.senderNrc || 'N/A'}</strong>
                </div>
                {transaction.senderPassbook && (
                  <div>
                    <span className="text-slate-500">{language === 'my' ? 'ဘဏ်စာအုပ်/အကောင့်' : 'Passbook / A/C'}:</span>{' '}
                    <strong className="font-mono text-slate-800">{transaction.senderPassbook}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.senderPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'နိုင်ငံ' : 'Country'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.senderCountryCode}</strong>
                </div>
              </div>
            </div>

            {/* Receiver */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                {language === 'my' ? 'ငွေလက်ခံသူ အချက်အလက် (Beneficiary)' : 'Beneficiary / Receiver Information'}
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500 block">{language === 'my' ? 'အမည်' : 'Name'}:</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {language === 'my'
                      ? `${transaction.receiverNameMm || transaction.receiverName} (${transaction.receiverName})`
                      : transaction.receiverName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>{' '}
                  <strong className="font-mono text-slate-800">{transaction.receiverNrc || 'N/A'}</strong>
                </div>
                {transaction.receiverPassbook && (
                  <div>
                    <span className="text-slate-500">{language === 'my' ? 'ဘဏ်စာအုပ်/အကောင့်' : 'Passbook / A/C'}:</span>{' '}
                    <strong className="font-mono text-slate-800">{transaction.receiverPassbook}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.receiverPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'ခရီးဆုံး နိုင်ငံ' : 'Destination'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.receiverCountryCode}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'my' ? 'ငွေပမာဏ နှင့် ငွေလဲလှယ်နှုန်း အသေးစိတ်' : 'Financial & Exchange Settlement Details'}
            </div>
            <div className="divide-y divide-slate-200 text-xs">
              <div className="px-4 py-2 flex justify-between">
                <span className="text-slate-600">{language === 'my' ? 'လွှဲပို့ငွေ မူလပမာဏ' : 'Send Principal Amount'}:</span>
                <span className="font-mono font-bold text-slate-900">
                  {transaction.sendAmount.toLocaleString()} {transaction.sourceCurrency}
                </span>
              </div>
              <div className="px-4 py-2 flex justify-between bg-slate-50/50">
                <span className="text-slate-600">{language === 'my' ? 'တွက်ချက်ထားသော ငွေလဲနှုန်း' : 'Applied Exchange Rate'}:</span>
                <span className="font-mono font-bold text-slate-900">
                  1 {transaction.sourceCurrency === 'MMK' ? transaction.targetCurrency : transaction.sourceCurrency} = {transaction.exchangeRate.toLocaleString()} MMK
                </span>
              </div>
              <div className="px-4 py-2 flex justify-between">
                <span className="text-slate-600">{language === 'my' ? 'ငွေလွှဲ ဝန်ဆောင်ခ' : 'Remittance Service Fee'}:</span>
                <span className="font-mono text-slate-800">
                  {transaction.serviceFee.toLocaleString()} MMK
                </span>
              </div>
              {transaction.commissionFee > 0 && (
                <div className="px-4 py-2 flex justify-between bg-slate-50/50">
                  <span className="text-slate-600">{language === 'my' ? 'မိတ်ဖက် ကော်မရှင်ခ' : 'Partner Commission'}:</span>
                  <span className="font-mono text-slate-800">
                    {transaction.commissionFee.toLocaleString()} MMK
                  </span>
                </div>
              )}
              <div className="px-4 py-3 flex justify-between bg-emerald-50 text-emerald-950 font-bold text-sm">
                <span>{language === 'my' ? 'လက်ခံရရှိငွေ စုစုပေါင်း' : 'Total Payout / Receive Amount'}:</span>
                <span className="font-mono text-base font-black text-emerald-800">
                  {transaction.receiveAmount.toLocaleString()} {transaction.targetCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* Remittance Purpose & Payout Method */}
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-700">{language === 'my' ? 'လွှဲပို့ရည်ရွယ်ချက်' : 'Purpose'}: </span>
              <span>{transaction.purposeName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">{language === 'my' ? 'ငွေထုတ်ယူနည်း' : 'Payout Method'}: </span>
              <span>
                {transaction.payoutMethod === 'CASH_PICKUP' && (language === 'my' ? 'ဘဏ်ကောင်တာ ငွေသားထုတ်ယူခြင်း' : 'Cash Counter Pickup')}
                {transaction.payoutMethod === 'BANK_ACCOUNT' && (language === 'my' ? `ဘဏ်အကောင့်သို့ တိုက်ရိုက်ထည့်သွင်းခြင်း (${transaction.payoutBankName || 'Bank'})` : `Bank Account Deposit (${transaction.payoutBankName || 'Bank'})`)}
                {transaction.payoutMethod === 'MOBILE_WALLET' && (language === 'my' ? 'မိုဘိုင်းပိုက်ဆံအိတ်' : 'Mobile Wallet')}
              </span>
            </div>
            {partner && (
              <div className="col-span-2">
                <span className="font-bold text-slate-700">{language === 'my' ? 'မိတ်ဖက် ကွန်ရက်' : 'Partner Channel'}: </span>
                <span>{language === 'my' ? `${partner.nameMm} (${partner.nameEn})` : partner.nameEn} ({partner.swiftCode || partner.code})</span>
              </div>
            )}
            {transaction.senderNote && (
              <div className="col-span-2 italic bg-slate-50 p-2 rounded border border-slate-200">
                {language === 'my' ? 'မှတ်ချက်' : 'Note'}: "{transaction.senderNote}"
              </div>
            )}
          </div>

          {/* Signatures & Stamp area */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
            <div>
              <div className="h-12 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-800">{transaction.creatorName || (language === 'my' ? 'စာရင်းသွင်းသူ' : 'Maker')}</p>
              <p className="text-[10px] text-slate-500">{language === 'my' ? 'စာရင်းသွင်းဝန်ထမ်း (Maker / Operator)' : 'Prepared / Operator'}</p>
            </div>
            <div>
              <div className="h-12 border-b border-slate-400 mb-1 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-300 px-3 py-1 rounded">
                  {language === 'my' ? 'ဘဏ်ခွဲ တံဆိပ်တုံး' : 'Official Branch Stamp'}
                </span>
              </div>
              <p className="font-bold text-slate-800">{language === 'my' ? 'ဘဏ်ခွဲ အတည်ပြုတံဆိပ်တုံး' : 'Branch Verification Stamp'}</p>
              <p className="text-[10px] text-slate-500">{language === 'my' ? 'ဗဟိုဘဏ် စည်းမျဉ်းကိုက်' : 'Central Bank Compliance'}</p>
            </div>
            <div>
              <div className="h-12 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-800">{transaction.approverName || (language === 'my' ? 'အတည်ပြုသူ မန်နေဂျာ' : 'Checker / Manager')}</p>
              <p className="text-[10px] text-slate-500">{language === 'my' ? 'ခွင့်ပြုအတည်ပြုသူ (Checker Approval)' : 'Authorized Checker Approval'}</p>
            </div>
          </div>

          {/* Compliance Footer notice */}
          <div className="text-[10px] text-slate-400 text-center leading-relaxed border-t border-slate-200 pt-3">
            {language === 'my'
              ? 'ဤငွေလွှဲပြောင်းမှုသည် မြန်မာနိုင်ငံတော်ဗဟိုဘဏ်၏ ငွေကြေးခဝါချမှုနှင့် အကြမ်းဖက်မှုကို ငွေကြေးထောက်ပံ့မှု တိုက်ဖျက်ရေး (AML/CFT) ညွှန်ကြားချက်များနှင့်အညီ စိစစ်အတည်ပြုထားပြီး ဖြစ်ပါသည်။'
              : 'This remittance transaction has been screened in compliance with the Central Bank of Myanmar Anti-Money Laundering (AML) & Counter-Terrorism Financing (CFT) guidelines. Keep this voucher and MTCN code secure. Beneficiary must present valid original Myanmar NRC for counter collection.'}
          </div>
        </div>
      </div>
    </div>
  );
};
