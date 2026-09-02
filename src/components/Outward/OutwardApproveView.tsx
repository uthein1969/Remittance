import React, { useState } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  PauseCircle, 
  Printer, 
  Eye, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowRight,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';

export const OutwardApproveView: React.FC = () => {
  const { db, language, t, approveTransaction, rejectTransaction, holdTransaction } = useRemittance();
  
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<RemittanceTransaction | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherTx, setVoucherTx] = useState<RemittanceTransaction | null>(null);

  const outwardTxs = db.transactions.filter(t => t.type === 'OUTWARD');

  const filteredTxs = outwardTxs.filter(tx => {
    if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transactionNo.toLowerCase().includes(q) ||
        tx.mtcn.toLowerCase().includes(q) ||
        tx.senderName.toLowerCase().includes(q) ||
        tx.receiverName.toLowerCase().includes(q) ||
        tx.senderNrc.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenReview = (tx: RemittanceTransaction) => {
    setSelectedTx(tx);
    setApprovalNote('Verified all sender/receiver compliance details and financial records.');
    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedTx) return;
    const success = await approveTransaction(selectedTx.id, approvalNote);
    if (success) {
      confetti({ particleCount: 70, spread: 60 });
      setShowReviewModal(false);
      setVoucherTx(selectedTx);
      setShowVoucherModal(true);
    }
  };

  const handleOpenReject = (tx: RemittanceTransaction) => {
    setSelectedTx(tx);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedTx || !rejectionReason.trim()) return;
    await rejectTransaction(selectedTx.id, rejectionReason);
    setShowRejectModal(false);
    setShowReviewModal(false);
  };

  const handleHold = async () => {
    if (!selectedTx) return;
    await holdTransaction(selectedTx.id, approvalNote || 'Placed on hold for KYC verification.');
    setShowReviewModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.outwardApproveTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.approveListSubtitle}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setFilterStatus('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'PENDING_APPROVAL' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'my' ? 'စိစစ်ရန်ကျန်' : 'Pending'} ({outwardTxs.filter(t => t.status === 'PENDING_APPROVAL').length})
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'APPROVED' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'my' ? 'အတည်ပြုပြီး' : 'Approved'}
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'my' ? 'MTCN၊ အမှတ်စဉ်၊ ပို့သူ/လက်ခံသူ အမည်ဖြင့် ရှာရန်...' : 'Search by MTCN, Tx No, Sender/Receiver...'}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          {filteredTxs.length} {language === 'my' ? 'ခု တွေ့ရှိပါသည်' : 'transactions found'}
        </div>
      </div>

      {/* Transaction List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{t.transactionNo} / MTCN</th>
                <th className="px-4 py-3">{t.senderName}</th>
                <th className="px-4 py-3">{t.receiverName}</th>
                <th className="px-4 py-3">{t.amount} & Exchange</th>
                <th className="px-4 py-3">{t.creator}</th>
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
                      <div className="font-mono font-bold text-white">{tx.transactionNo}</div>
                      <div className="font-mono text-amber-400 text-[11px]">MTCN: {tx.mtcn}</div>
                      <div className="text-[10px] text-slate-500">{new Date(tx.createdDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.senderName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.senderNrc}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.receiverName}</div>
                      <div className="text-[11px] text-slate-400">Destination: {tx.receiverCountryCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-emerald-400">
                        {tx.sendAmount.toLocaleString()} {tx.sourceCurrency}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ➔ {tx.receiveAmount.toLocaleString()} {tx.targetCurrency}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-300">{tx.creatorName}</div>
                      <div className="text-[10px] text-slate-500">{tx.purposeName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'APPROVED' || tx.status === 'PAID_OUT'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : tx.status === 'ON_HOLD'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {tx.status === 'PENDING_APPROVAL' ? (
                          <button
                            onClick={() => handleOpenReview(tx)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-colors"
                          >
                            {t.review}
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

      {/* Checker Review Modal */}
      {showReviewModal && selectedTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {language === 'my' ? 'ငွေလွှဲပို့မှု စိစစ်အတည်ပြုခြင်း (Checker Review)' : 'Outward Remittance Approval Review'}
                </h3>
              </div>
              <span className="font-mono text-xs text-amber-400 font-bold">{selectedTx.transactionNo}</span>
            </div>

            {/* Quick overview grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">{t.senderName}:</span>
                <strong className="text-slate-200 text-sm">{selectedTx.senderName}</strong>
                <p className="text-[11px] text-slate-400 font-mono">{selectedTx.senderNrc}</p>
                <p className="text-[11px] text-slate-400">{selectedTx.senderPhone}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">{t.receiverName}:</span>
                <strong className="text-slate-200 text-sm">{selectedTx.receiverName}</strong>
                <p className="text-[11px] text-slate-400">Destination: {selectedTx.receiverCountryCode}</p>
                <p className="text-[11px] text-slate-400">{selectedTx.receiverPhone}</p>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <span className="text-slate-400 block font-medium">{t.sendAmount}:</span>
                <strong className="text-emerald-400 text-sm font-mono">
                  {selectedTx.sendAmount.toLocaleString()} {selectedTx.sourceCurrency}
                </strong>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <span className="text-slate-400 block font-medium">{t.receiveAmount}:</span>
                <strong className="text-emerald-400 text-sm font-mono">
                  {selectedTx.receiveAmount.toLocaleString()} {selectedTx.targetCurrency}
                </strong>
              </div>
            </div>

            {/* Compliance Check Status */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center space-x-2 text-xs text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{t.cleanRecord}</span>
            </div>

            {/* Maker Note */}
            {selectedTx.senderNote && (
              <div className="text-xs bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-bold block">{t.makerNote}:</span>
                <span className="text-slate-200 italic">"{selectedTx.senderNote}"</span>
              </div>
            )}

            {/* Approval Remarks Input */}
            <div className="text-xs">
              <label className="block text-slate-400 mb-1 font-medium">{t.approvalNote}</label>
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Remarks for audit trail..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Modal Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleHold}
                className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold transition-colors"
              >
                {t.hold}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    handleOpenReject(selectedTx);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                >
                  {t.reject}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02]"
                >
                  {t.approve}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Prompt Modal */}
      {showRejectModal && selectedTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-600 text-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-rose-400">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-bold">{t.reject} - {selectedTx.transactionNo}</h3>
            </div>
            <p className="text-xs text-slate-300">
              {language === 'my' ? 'ငြင်းပယ်ရသည့် အကြောင်းအရင်းကို အသေးစိတ် ထည့်သွင်းပေးပါ (Audit Log တွင် သိမ်းဆည်းမည်)' : 'Please provide the mandatory rejection reason. This will be recorded in compliance audit.'}
            </p>
            <div>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Inconsistent NRC spelling / Unverified overseas tuition invoice"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {t.reject}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Voucher Modal */}
      <VoucherModal
        isOpen={showVoucherModal}
        transaction={voucherTx}
        onClose={() => setShowVoucherModal(false)}
      />
    </div>
  );
};
