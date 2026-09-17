import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Search, 
  DownloadCloud, 
  Coins, 
  ShieldCheck,
  UserCheck,
  Edit3,
  Building2,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { EditInwardModal } from './EditInwardModal';

export interface InwardApproveViewProps {
  initialTxId?: string | null;
  onClearInitialTxId?: () => void;
}

export const InwardApproveView: React.FC<InwardApproveViewProps> = ({
  initialTxId,
  onClearInitialTxId
}) => {
  const { 
    db, 
    language, 
    t, 
    approveTransaction, 
    payoutInwardTransaction, 
    rejectTransaction,
    isSyncingTurso,
    syncTursoBidirectional,
    activeBranchId,
    activeCountryCode
  } = useRemittance();

  const [filterStatus, setFilterStatus] = useState('PENDING_APPROVAL');
  const [selectedCountry, setSelectedCountry] = useState(activeCountryCode || 'ALL');
  const [selectedBranch, setSelectedBranch] = useState(activeBranchId || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<RemittanceTransaction | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherTx, setVoucherTx] = useState<RemittanceTransaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<RemittanceTransaction | null>(null);

  useEffect(() => {
    if (initialTxId) {
      const tx = db.transactions.find(t => t.id === initialTxId && t.type === 'INWARD');
      if (tx) {
        setSelectedBranch('ALL');
        setSelectedCountry('ALL');
        setFilterStatus(tx.status || 'PENDING_APPROVAL');
        setSearchQuery(tx.transactionNo);
        setSelectedTx(tx);
        setShowReviewModal(true);
        if (onClearInitialTxId) {
          onClearInitialTxId();
        }
      }
    }
  }, [initialTxId, db.transactions, onClearInitialTxId]);

  const handleOpenEdit = (tx: RemittanceTransaction) => {
    setEditingTx(tx);
    setShowEditModal(true);
  };

  const inwardTxs = db.transactions.filter(t => t.type === 'INWARD');

  const filteredTxs = inwardTxs.filter(tx => {
    if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false;
    
    // Country Filter
    if (selectedCountry !== 'ALL') {
      const branch = db.branches.find(b => b.id === (tx.payoutBranchId || tx.branchId));
      const match = branch?.countryCode === selectedCountry || 
        tx.senderCountryCode === selectedCountry || 
        tx.receiverCountryCode === selectedCountry;
      if (!match) return false;
    }

    // Branch Filter
    if (selectedBranch !== 'ALL' && tx.payoutBranchId !== selectedBranch && tx.branchId !== selectedBranch) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transactionNo.toLowerCase().includes(q) ||
        tx.mtcn.toLowerCase().includes(q) ||
        tx.receiverName.toLowerCase().includes(q) ||
        tx.receiverNrc.toLowerCase().includes(q) ||
        tx.senderName.toLowerCase().includes(q)
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

        {/* Filter status tabs & Cloud Sync */}
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Turso Cloud Live Sync Button */}
          <button
            onClick={() => syncTursoBidirectional()}
            disabled={isSyncingTurso}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-xs"
            title={language === 'my' ? 'Turso Cloud မှ စာရင်းအသစ်များ ရယူရန် / Refresh လုပ်ရန် နှိပ်ပါ' : 'Fetch latest transactions from Turso Cloud'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTurso ? 'animate-spin text-teal-400' : 'text-teal-400'}`} />
            <span>{isSyncingTurso ? (language === 'my' ? 'Sync လုပ်နေသည်...' : 'Syncing...') : (language === 'my' ? 'Cloud Sync' : 'Sync Cloud')}</span>
          </button>
        </div>
      </div>

      {/* Search & Location Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'my' ? 'MTCN သို့မဟုတ် လက်ခံသူ မှတ်ပုံတင်ဖြင့် ရှာရန်...' : 'Search by MTCN or Beneficiary NRC...'}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Country Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1">
            <span className="text-[11px] text-slate-400 font-medium">
              {language === 'my' ? 'နိုင်ငံ:' : 'Country:'}
            </span>
            <select
              value={selectedCountry}
              onChange={(e) => {
                const c = e.target.value;
                setSelectedCountry(c);
                if (c !== 'ALL') {
                  const b = db.branches.find(br => br.countryCode === c);
                  if (b) setSelectedBranch(b.id);
                  else setSelectedBranch('ALL');
                } else {
                  setSelectedBranch('ALL');
                }
              }}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">🌐 {language === 'my' ? 'နိုင်ငံအားလုံး' : 'All Countries'}</option>
              {db.countries.map(c => (
                <option key={c.id} value={c.code} className="bg-slate-900 text-white">
                  {c.flagEmoji} {c.nameEn} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1">
            <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">
              {language === 'my' ? 'ဘဏ်ခွဲ:' : 'Branch:'}
            </span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL" className="bg-slate-900 text-white">{language === 'my' ? 'ဘဏ်ခွဲအားလုံး' : 'All Branches'}</option>
              {db.branches
                .filter(b => selectedCountry === 'ALL' || b.countryCode === selectedCountry)
                .map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.code} - {b.nameEn}
                  </option>
                ))}
            </select>
          </div>

          {(selectedCountry !== 'ALL' || selectedBranch !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCountry('ALL');
                setSelectedBranch('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium px-1 cursor-pointer"
            >
              {language === 'my' ? 'အားလုံးပြမည် (Reset)' : 'Reset All'}
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 self-end md:self-center font-mono shrink-0">
          <span className="text-teal-400 font-bold">{filteredTxs.length}</span> {language === 'my' ? 'ခု ရှာတွေ့သည်' : 'records found'}
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
                        {Number(tx.receiveAmount || 0).toLocaleString()} MMK
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({Number(tx.sendAmount || 0).toLocaleString()} {tx.sourceCurrency} @ {Number(tx.exchangeRate || 0).toLocaleString()})
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                          {tx.payoutMethod === 'CASH_PICKUP' ? 'Cash Pickup' : 'Bank Deposit'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-teal-400 font-mono mt-1">
                        <Building2 className="w-3 h-3 text-teal-400 shrink-0" />
                        <span>{db.branches.find(b => b.id === tx.payoutBranchId)?.code || tx.payoutBranchId || 'BR-001'}</span>
                      </div>
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
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tx)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 font-semibold text-xs transition-all flex items-center space-x-1 hover:scale-[1.02]"
                          title={language === 'my' ? 'အချက်အလက် ပြင်ဆင်ရန်' : 'Edit Inward Record'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{t.edit}</span>
                        </button>

                        {tx.status === 'PENDING_APPROVAL' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTx(tx);
                                setShowReviewModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 hover:text-teal-300 border border-teal-500/30 font-semibold text-xs transition-all flex items-center space-x-1 hover:scale-[1.02] cursor-pointer"
                              title={language === 'my' ? 'အသေးစိတ် စစ်ဆေးမည်' : 'Review Details'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'စိစစ်ရန်' : 'Review'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTx(tx);
                                setShowReviewModal(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition-all hover:scale-[1.02] cursor-pointer"
                            >
                              {language === 'my' ? 'ငွေထုတ်ပေးမည်' : 'Authorize Payout'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
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

      {/* Inward Review & Payout Verification Modal */}
      {showReviewModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{language === 'my' ? 'ပြည်တွင်းငွေလွှဲ စိစစ်အတည်ပြုခြင်း' : 'Inward Remittance Review'}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300">
                      {selectedTx.transactionNo}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    MTCN: <span className="font-mono font-bold text-teal-300">{selectedTx.mtcn}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Beneficiary & Sender Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'ငွေထုတ်ယူသူ (လက်ခံသူ)' : 'Beneficiary / Receiver'}</span>
                  </div>
                  <div className="text-sm font-bold text-white">{selectedTx.receiverName}</div>
                  {selectedTx.receiverNameMm && (
                    <div className="text-xs text-slate-300 font-myanmar">{selectedTx.receiverNameMm}</div>
                  )}
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">NRC:</span> <span className="font-mono font-semibold text-white">{selectedTx.receiverNrc}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Phone:</span> <span className="font-mono">{selectedTx.receiverPhone}</span>
                  </div>
                  {selectedTx.receiverAddress && (
                    <div className="text-xs text-slate-400 truncate">
                      <span>Address:</span> {selectedTx.receiverAddress}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'ငွေလွှဲပို့သူ (Sender)' : 'Remitter / Sender'}</span>
                  </div>
                  <div className="text-sm font-bold text-white">{selectedTx.senderName}</div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Origin Country:</span> <span className="font-semibold text-white">{selectedTx.senderCountryCode}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Purpose:</span> <span>{selectedTx.purposeName || 'Family Support'}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span>Date:</span> <span className="font-mono">{selectedTx.createdDate ? new Date(selectedTx.createdDate).toLocaleString() : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Financial Details Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/40 to-slate-900 border border-teal-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
                    {language === 'my' ? 'ထုတ်ပေးရမည့် ငွေပမာဏ' : 'Net Payout Amount'}
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                    {Number(selectedTx.receiveAmount || 0).toLocaleString()} MMK
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {Number(selectedTx.sendAmount || 0).toLocaleString()} {selectedTx.sourceCurrency} @ {Number(selectedTx.exchangeRate || 0).toLocaleString()}
                  </div>
                </div>

                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedTx.status === 'PAID_OUT' || selectedTx.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}>
                    {selectedTx.status}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Method: {selectedTx.payoutMethod === 'CASH_PICKUP' ? 'Counter Cash Pickup' : 'Bank Deposit'}
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'my' ? 'Checker စစ်ဆေးရမည့် အချက်များ:' : 'Checker Verification Checklist:'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'မူရင်းမှတ်ပုံတင် တိုက်ဆိုင်စစ်ဆေးပြီး' : 'Original Myanmar NRC matched'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'MTCN လျှို့ဝှက်ကုဒ် မှန်ကန်မှု စစ်ဆေးပြီး' : 'MTCN secret code verified'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'Blacklist / AML စာရင်း စစ်ဆေးပြီး' : 'Sanction & Blacklist cleared'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'ငွေသားပမာဏ မှန်ကန်မှု စစ်ဆေးပြီး' : 'MMK cash denomination ready'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  handleOpenEdit(selectedTx);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'အချက်အလက် ပြင်ဆင်ရန်' : 'Review & Edit'}</span>
              </button>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {language === 'my' ? 'ပိတ်မည်' : 'Close'}
                </button>

                {selectedTx.status === 'PENDING_APPROVAL' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const txToPayout = selectedTx;
                      setShowReviewModal(false);
                      await handleAuthorizePayout(txToPayout);
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === 'my' ? 'ငွေထုတ်ပေးမည် (Authorize Payout)' : 'Authorize Payout & Issue Voucher'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inward Modal */}
      <EditInwardModal
        isOpen={showEditModal}
        transaction={editingTx}
        onClose={() => {
          setShowEditModal(false);
          setEditingTx(null);
        }}
      />

      {/* Voucher Modal */}
      <VoucherModal
        isOpen={showVoucherModal}
        transaction={voucherTx}
        onClose={() => setShowVoucherModal(false)}
      />
    </div>
  );
};
