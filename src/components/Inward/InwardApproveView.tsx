import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Search, 
  DownloadCloud, 
  Coins, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';

export const InwardApproveView: React.FC = () => {
  const { db, language, t, approveTransaction, payoutInwardTransaction, rejectTransaction } = useRemittance();

  const [filterStatus, setFilterStatus] = useState('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<RemittanceTransaction | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherTx, setVoucherTx] = useState<RemittanceTransaction | null>(null);

  const inwardTxs = db.transactions.filter(t => t.type === 'INWARD');

  const filteredTxs = inwardTxs.filter(tx => {
    if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transactionNo.toLowerCase().includes(q) ||
        tx.mtcn.toLowerCase().includes(q) ||
        tx.receiverName.toLowerCase().includes(q) ||
        tx.receiverNrc.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAuthorizePayout = async (tx: RemittanceTransaction) => {
    const success = await payoutInwardTransaction(tx.id, 'Counter cash payout verified with original Myanmar NRC');
    if (success) {
      confetti({ particleCount: 70, spread: 60 });
      setVoucherTx(tx);
      setShowVoucherModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.inwardApproveTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'my' 
              ? 'ငွေထုတ်ယူသူ၏ မှတ်ပုံတင် စိစစ်ပြီး ငွေသားထုတ်ပေးရန် ခွင့်ပြုခြင်း' 
              : 'Checker verification & cash payout authorization'}
          </p>
        </div>

        {/* Filter status tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setFilterStatus('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'PENDING_APPROVAL' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'my' ? 'ထုတ်ပေးရန် စောင့်ဆိုင်းဆဲ' : 'Pending Payout'} ({inwardTxs.filter(t => t.status === 'PENDING_APPROVAL').length})
          </button>
          <button
            onClick={() => setFilterStatus('PAID_OUT')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'PAID_OUT' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'my' ? 'ငွေထုတ်ယူပြီး' : 'Disbursed / Paid'}
          </button>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.all}
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'my' ? 'MTCN သို့မဟုတ် လက်ခံသူ မှတ်ပုံတင်ဖြင့် ရှာရန်...' : 'Search by MTCN or Beneficiary NRC...'}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          {filteredTxs.length} {language === 'my' ? 'ခု' : 'records'}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{t.mtcnCode} / Tx No</th>
                <th className="px-4 py-3">{language === 'my' ? 'ငွေထုတ်ယူသူ (Beneficiary)' : 'Beneficiary'}</th>
                <th className="px-4 py-3">{language === 'my' ? 'လွှဲပို့သူ (Sender)' : 'Origin Sender'}</th>
                <th className="px-4 py-3">{language === 'my' ? 'ထုတ်ပေးငွေ (Payout MMK)' : 'Payout Amount'}</th>
                <th className="px-4 py-3">{t.payoutMethod}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-amber-400 text-sm">{tx.mtcn}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{tx.transactionNo}</div>
                      <div className="text-[10px] text-slate-500">{new Date(tx.createdDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.receiverName}</div>
                      <div className="font-mono text-[11px] text-slate-400">{tx.receiverNrc}</div>
                      <div className="text-[10px] text-slate-500">{tx.receiverPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{tx.senderName}</div>
                      <div className="text-[11px] text-slate-400">From: {tx.senderCountryCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-base text-emerald-400">
                        {tx.receiveAmount.toLocaleString()} MMK
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({tx.sendAmount.toLocaleString()} {tx.sourceCurrency} @ {tx.exchangeRate})
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                        {tx.payoutMethod === 'CASH_PICKUP' ? 'Cash Pickup' : 'Bank Deposit'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'PAID_OUT' || tx.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 animate-pulse'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {tx.status === 'PENDING_APPROVAL' ? (
                          <button
                            onClick={() => handleAuthorizePayout(tx)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition-all hover:scale-[1.02]"
                          >
                            {language === 'my' ? 'ငွေထုတ်ပေးမည်' : 'Authorize Payout'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setVoucherTx(tx);
                              setShowVoucherModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title={t.printVoucher}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Modal */}
      <VoucherModal
        isOpen={showVoucherModal}
        transaction={voucherTx}
        onClose={() => setShowVoucherModal(false)}
      />
    </div>
  );
};
