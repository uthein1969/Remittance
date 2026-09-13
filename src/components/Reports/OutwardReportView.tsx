import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  Coins, 
  ArrowUpRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';

export const OutwardReportView: React.FC = () => {
  const { db, language, t } = useRemittance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedVoucherTx, setSelectedVoucherTx] = useState<RemittanceTransaction | null>(null);

  const outwardTxs = db.transactions.filter(t => t.type === 'OUTWARD');

  const filteredTxs = outwardTxs.filter(tx => {
    if (selectedCurrency !== 'ALL' && tx.targetCurrency !== selectedCurrency && tx.sourceCurrency !== selectedCurrency) return false;
    if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) return false;
    if (selectedBranch !== 'ALL' && tx.sendingBranchId !== selectedBranch) return false;
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

  // Calculate totals
  const totalVolumeMMK = filteredTxs.reduce((sum, tx) => sum + (tx.sourceCurrency === 'MMK' ? tx.sendAmount : tx.totalPayableAmount), 0);
  const totalFeesMMK = filteredTxs.reduce((sum, tx) => sum + tx.serviceFee + tx.commissionFee, 0);

  // CSV Export
  const exportCsv = () => {
    const headers = ['Transaction No', 'MTCN', 'Date', 'Branch', 'Sender Name', 'Sender NRC', 'Receiver Name', 'Destination', 'Send Amount', 'Currency', 'Exchange Rate', 'Receive Amount', 'Target Currency', 'Service Fee', 'Status'];
    const rows = filteredTxs.map(tx => {
      const branch = db.branches.find(b => b.id === tx.sendingBranchId);
      return [
        tx.transactionNo,
        tx.mtcn,
        new Date(tx.createdDate).toISOString().split('T')[0],
        `"${branch ? `${branch.code} - ${branch.nameEn}` : (tx.sendingBranchId || 'BR-001')}"`,
        `"${tx.senderName}"`,
        `"${tx.senderNrc}"`,
        `"${tx.receiverName}"`,
        tx.receiverCountryCode,
        tx.sendAmount,
        tx.sourceCurrency,
        tx.exchangeRate,
        tx.receiveAmount,
        tx.targetCurrency,
        tx.serviceFee,
        tx.status
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Outward_Remittance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.outwardReportTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'my' 
              ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲပို့မှု အစီရင်ခံစာနှင့် အသေးစိတ် စာရင်းဇယား' 
              : 'Detailed audit ledger and exportable outward remittance statements'}
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{t.exportCsv}</span>
        </button>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t.totalAmount} (Volume)</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {totalVolumeMMK.toLocaleString()} <span className="text-xs text-sky-400 font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">{filteredTxs.length} {language === 'my' ? 'ခု ပါဝင်သည်' : 'transactions'}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Service Revenue</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalFeesMMK.toLocaleString()} <span className="text-xs font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Service fees & commissions</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Average Transfer</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {filteredTxs.length > 0 ? (totalVolumeMMK / filteredTxs.length).toFixed(0).toLocaleString() : 0} <span className="text-xs font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Per outward transfer</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'my' ? 'ရှာဖွေရန်...' : 'Search MTCN, Sender, Tx...'}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Currencies (အားလုံး)</option>
            {db.currencies.map(c => (
              <option key={c.id} value={c.code}>{c.code} ({c.nameEn})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Status (အခြေအနေ အားလုံး)</option>
            <option value="APPROVED">APPROVED (အတည်ပြုပြီး)</option>
            <option value="PENDING_APPROVAL">PENDING (စိစစ်ဆဲ)</option>
            <option value="PAID_OUT">PAID OUT (ထုတ်ယူပြီး)</option>
            <option value="REJECTED">REJECTED (ငြင်းပယ်ထား)</option>
            <option value="ON_HOLD">ON HOLD (ဆိုင်းငံ့)</option>
          </select>
        </div>

        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Branches (ဘဏ်ခွဲ အားလုံး)</option>
            {db.branches.map(b => (
              <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Tx No / MTCN</th>
                <th className="px-4 py-3">{t.date}</th>
                <th className="px-4 py-3">{t.branch}</th>
                <th className="px-4 py-3">{t.senderName}</th>
                <th className="px-4 py-3">{t.receiverName}</th>
                <th className="px-4 py-3">{t.sendAmount}</th>
                <th className="px-4 py-3">{t.receiveAmount}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-white block">{tx.transactionNo}</span>
                      <span className="font-mono text-amber-400 text-[11px]">MTCN: {tx.mtcn}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {new Date(tx.createdDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sky-400 font-semibold text-[11px] block">
                        {db.branches.find(b => b.id === tx.sendingBranchId)?.code || tx.sendingBranchId || 'BR-001'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {db.branches.find(b => b.id === tx.sendingBranchId)?.nameEn || 'Yangon HQ'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{tx.senderName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{tx.senderNrc}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{tx.receiverName}</div>
                      <div className="text-[10px] text-slate-500">{tx.receiverCountryCode}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">
                      {Number(tx.sendAmount || 0).toLocaleString()} {tx.sourceCurrency}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {Number(tx.receiveAmount || 0).toLocaleString()} {tx.targetCurrency}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'APPROVED' || tx.status === 'PAID_OUT'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedVoucherTx(tx)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title={t.printVoucher}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
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
        isOpen={!!selectedVoucherTx}
        transaction={selectedVoucherTx}
        onClose={() => setSelectedVoucherTx(null)}
      />
    </div>
  );
};
