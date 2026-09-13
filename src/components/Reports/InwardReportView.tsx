import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  DownloadCloud, 
  Coins, 
  CheckCircle2,
  Paperclip
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';

export const InwardReportView: React.FC = () => {
  const { db, language, t } = useRemittance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedVoucherTx, setSelectedVoucherTx] = useState<RemittanceTransaction | null>(null);

  const inwardTxs = db.transactions.filter(t => t.type === 'INWARD');

  const filteredTxs = inwardTxs.filter(tx => {
    if (selectedCurrency !== 'ALL' && tx.sourceCurrency !== selectedCurrency) return false;
    if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) return false;
    if (selectedBranch !== 'ALL' && tx.payoutBranchId !== selectedBranch) return false;
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

  const totalPayoutMMK = filteredTxs.reduce((sum, tx) => sum + tx.receiveAmount, 0);

  const exportCsv = () => {
    const headers = ['Transaction No', 'MTCN', 'Date', 'Payout Branch', 'Beneficiary', 'NRC', 'Sender', 'Sender Passport', 'Passport Attached', 'Origin Country', 'Origin Amount', 'Origin Currency', 'Exchange Rate', 'Payout Amount (MMK)', 'Payout Method', 'Status'];
    const rows = filteredTxs.map(tx => {
      const branch = db.branches.find(b => b.id === tx.payoutBranchId);
      return [
        tx.transactionNo,
        tx.mtcn,
        new Date(tx.createdDate).toISOString().split('T')[0],
        `"${branch ? `${branch.code} - ${branch.nameEn}` : (tx.payoutBranchId || 'BR-001')}"`,
        `"${tx.receiverName}"`,
        `"${tx.receiverNrc}"`,
        `"${tx.senderName}"`,
        `"${tx.senderPassport || tx.senderPassbook || ''}"`,
        (tx.senderPassportAttachment || tx.senderPassbookAttachment) ? 'YES' : 'NO',
        tx.senderCountryCode,
        tx.sendAmount,
        tx.sourceCurrency,
        tx.exchangeRate,
        tx.receiveAmount,
        tx.payoutMethod,
        tx.status
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inward_Remittance_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
            <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.inwardReportTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'my' 
              ? 'ပြည်ပမှ ပြည်တွင်းသို့ ငွေလွှဲလက်ခံ ထုတ်ယူမှု အစီရင်ခံစာနှင့် စာရင်းဇယား' 
              : 'Inbound foreign remittance claim reconciliation and disbursement reports'}
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

      {/* KPI Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Disbursed MMK Payout</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalPayoutMMK.toLocaleString()} <span className="text-xs font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">{filteredTxs.length} claims filtered</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Disbursement Status</span>
          <div className="text-2xl font-black text-teal-400 font-mono mt-1">
            {filteredTxs.filter(t => t.status === 'PAID_OUT' || t.status === 'APPROVED').length} / {filteredTxs.length}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Successfully disbursed claims</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search MTCN, Beneficiary NRC..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Source Currencies</option>
            {db.currencies.filter(c => c.code !== 'MMK').map(c => (
              <option key={c.id} value={c.code}>{c.code} ({c.nameEn})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Status</option>
            <option value="PAID_OUT">PAID OUT (ထုတ်ယူပြီး)</option>
            <option value="PENDING_APPROVAL">PENDING (စိစစ်ဆဲ)</option>
            <option value="APPROVED">APPROVED (ခွင့်ပြုပြီး)</option>
          </select>
        </div>

        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Branches (ဘဏ်ခွဲ အားလုံး)</option>
            {db.branches.map(b => (
              <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">MTCN / Tx No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">{t.branch}</th>
                <th className="px-4 py-3">Beneficiary (Myanmar)</th>
                <th className="px-4 py-3">Origin Sender</th>
                <th className="px-4 py-3">Payout Amount (MMK)</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
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
                      <span className="font-mono font-bold text-amber-400 text-sm block">{tx.mtcn}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{tx.transactionNo}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {new Date(tx.createdDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-teal-400 font-semibold text-[11px] block">
                        {db.branches.find(b => b.id === tx.payoutBranchId)?.code || tx.payoutBranchId || 'BR-001'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {db.branches.find(b => b.id === tx.payoutBranchId)?.nameEn || 'Yangon HQ'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{tx.receiverName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{tx.receiverNrc}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{tx.senderName}</div>
                      <div className="text-[10px] text-slate-500">From: {tx.senderCountryCode}</div>
                      {(tx.senderPassport || tx.senderPassbook) && (
                        <div className="text-[10px] text-slate-400 font-mono">Passport: {tx.senderPassport || tx.senderPassbook}</div>
                      )}
                      {(tx.senderPassportAttachment || tx.senderPassbookAttachment) && (
                        <a 
                          href={tx.senderPassportAttachment || tx.senderPassbookAttachment}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-[10px] text-indigo-300 hover:text-indigo-200 mt-0.5 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/60"
                          title="View attached passport"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          <span>Passport</span>
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-sm">
                      {Number(tx.receiveAmount || 0).toLocaleString()} MMK
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {tx.payoutMethod === 'CASH_PICKUP' ? 'Counter Cash' : 'Bank Deposit'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'PAID_OUT' || tx.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-teal-500/20 text-teal-300'
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

      <VoucherModal
        isOpen={!!selectedVoucherTx}
        transaction={selectedVoucherTx}
        onClose={() => setSelectedVoucherTx(null)}
      />
    </div>
  );
};
