import React, { useState } from 'react';
import { 
  TrendingUp, 
  Send, 
  DownloadCloud, 
  CheckSquare, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Coins, 
  Building2, 
  Eye, 
  Printer, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { NavigationTab, SetupSubTab } from '../Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab, setupTab?: SetupSubTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { db, language, t, approveTransaction, currentUser } = useRemittance();
  const [selectedVoucherTx, setSelectedVoucherTx] = useState<RemittanceTransaction | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Calculations
  const outwardTxs = db.transactions.filter(t => t.type === 'OUTWARD');
  const inwardTxs = db.transactions.filter(t => t.type === 'INWARD');
  
  const totalOutwardMMK = outwardTxs.reduce((sum, tx) => {
    return sum + (tx.sourceCurrency === 'MMK' ? tx.sendAmount : tx.totalPayableAmount);
  }, 0);

  const totalInwardMMK = inwardTxs.reduce((sum, tx) => {
    return sum + (tx.targetCurrency === 'MMK' ? tx.receiveAmount : tx.sendAmount);
  }, 0);

  const pendingTxs = db.transactions.filter(t => t.status === 'PENDING_APPROVAL');
  const activeBlacklistCount = db.blacklist.filter(b => b.active).length;

  const quickApprove = async (txId: string) => {
    setApprovingId(txId);
    await approveTransaction(txId, 'Quick-approved from Dashboard overview');
    setApprovingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              {language === 'my' ? 'စနစ် ကောင်းမွန်စွာ လည်ပတ်နေပါသည်' : 'System Operational'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">
              {new Date().toLocaleDateString(language === 'my' ? 'my-MM' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-1">
            {language === 'my' ? 'ငွေလွှဲလုပ်ငန်း ပင်မ စီမံခန့်ခွဲမှု (Dashboard)' : 'Remittance Control Terminal'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'my' 
              ? 'ပြည်တွင်းနှင့် ပြည်ပ ငွေလွှဲစီးဆင်းမှု၊ စစ်ဆေးအတည်ပြုရန် ကျန်ရှိမှုများ နှင့် နာမည်ပျက်စာရင်း စောင့်ကြည့်မှုများ' 
              : 'Real-time overview of outward & inward transfer flows, maker-checker queues, and AML watchlist.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('outward_entry')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'ငွေလွှဲပို့မည်' : 'New Outward'}</span>
          </button>
          <button
            onClick={() => onNavigate('inward_entry')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'ငွေလွှဲထုတ်မည်' : 'New Inward Claim'}</span>
          </button>
          <button
            onClick={() => onNavigate('admin_setup', 'blacklist')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{language === 'my' ? 'Blacklist စစ်ဆေး' : 'Blacklist'}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Outward Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.todayOutward}
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {totalOutwardMMK.toLocaleString()}
            </span>
            <span className="text-xs text-blue-600 ml-1 font-bold">MMK</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{outwardTxs.length} {language === 'my' ? 'ကြိမ် လွှဲပို့ပြီး' : 'transactions'}</span>
            <button 
              onClick={() => onNavigate('outward_report')}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Inward Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.todayInward}
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {totalInwardMMK.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 ml-1 font-bold">MMK</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{inwardTxs.length} {language === 'my' ? 'ကြိမ် ထုတ်ယူပြီး' : 'payouts'}</span>
            <button 
              onClick={() => onNavigate('inward_report')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.pendingApprovals}
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-600 font-mono tracking-tight">
              {pendingTxs.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {language === 'my' ? 'ခု စိစစ်ရန်' : 'awaiting checker'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-amber-700 font-medium">{language === 'my' ? 'Maker တင်ပြချက်' : 'Requires action'}</span>
            <button 
              onClick={() => onNavigate('outward_approve')}
              className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-0.5"
            >
              <span>{language === 'my' ? 'စစ်ဆေးမည်' : 'Review'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Blacklist Screening Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.activeBlacklist}
            </span>
            <div className="w-7 h-7 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-600 font-mono tracking-tight">
              {activeBlacklistCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {language === 'my' ? 'ဦး ပိတ်ပင်ထား' : 'flagged subjects'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-rose-700 font-medium">NRC & Passbook</span>
            <button 
              onClick={() => onNavigate('admin_setup', 'blacklist')}
              className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Exchange Rates Ticker Board */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t.exchangeRateBoard} (MMK)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('admin_setup', 'exchange_rate')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>{language === 'my' ? 'ငွေလဲနှုန်း ပြင်ဆင်မည်' : 'Adjust Rates'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-3">
          {db.exchangeRates.slice(0, 6).map((rate) => {
            const country = db.countries.find(c => c.currencyCode === rate.fromCurrency);
            return (
              <div 
                key={rate.id}
                className="bg-slate-50 border border-slate-200 rounded-md p-2.5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm">{country?.flagEmoji || '💱'}</span>
                    <span className="font-bold text-xs text-slate-800">{rate.fromCurrency}/MMK</span>
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{language === 'my' ? 'ငွေလွှဲ:' : 'Remit:'}</span>
                    <strong className="text-blue-600 font-mono font-bold text-xs">
                      {rate.transferRate.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{language === 'my' ? 'ဝယ်/ရောင်း:' : 'B/S:'}</span>
                    <span className="font-mono">{rate.buyRate}/{rate.sellRate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column: Urgent Pending Approval Queue & Recent Completed Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 cols: Urgent Approval Queue */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {t.urgentQueue} ({pendingTxs.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('outward_approve')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  {language === 'my' ? 'Outward အတည်ပြုရန်' : 'Outward Queue'}
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => onNavigate('inward_approve')}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                >
                  {language === 'my' ? 'Inward အတည်ပြုရန်' : 'Inward Queue'}
                </button>
              </div>
            </div>

            {pendingTxs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-medium text-slate-600">{t.noPendingTransactions}</p>
                <span className="text-[11px] text-slate-400">All pending transfers have been processed</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTxs.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 px-1 rounded transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          tx.type === 'OUTWARD' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {tx.type}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">{tx.transactionNo}</span>
                        <span className="text-[11px] text-slate-500 font-mono">MTCN: {tx.mtcn}</span>
                      </div>
                      <div className="text-xs text-slate-800 mt-1">
                        <strong>{tx.senderName}</strong> <span className="text-slate-400">➔</span> <strong>{tx.receiverName}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {tx.purposeName} • Maker: <span className="text-slate-700 font-medium">{tx.creatorName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3">
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-blue-600">
                          {tx.sendAmount.toLocaleString()} {tx.sourceCurrency}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ➔ {tx.receiveAmount.toLocaleString()} {tx.targetCurrency}
                        </div>
                      </div>

                      {/* Quick Approve or review */}
                      <button
                        onClick={() => quickApprove(tx.id)}
                        disabled={approvingId === tx.id}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                      >
                        {approvingId === tx.id ? '...' : t.approve}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: Recent Transactions Feed + Blacklist Alert Mini-Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recent Completed */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t.recentTransactions}
              </h3>
              <button
                onClick={() => onNavigate('outward_report')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                {t.viewAll}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {db.transactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="py-2 flex items-center justify-between hover:bg-slate-50 px-1 rounded transition-colors">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-slate-800">{tx.transactionNo}</span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase ${
                        tx.status === 'APPROVED' || tx.status === 'PAID_OUT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate max-w-[180px]">
                      {tx.senderName} ➔ {tx.receiverName}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {tx.receiveAmount.toLocaleString()} {tx.targetCurrency}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(tx.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedVoucherTx(tx)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200"
                      title={t.printVoucher}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blacklist Monitor card */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200/80">
              <div className="flex items-center space-x-1.5 text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  AML Blacklist Monitor
                </h3>
              </div>
              <button
                onClick={() => onNavigate('admin_setup', 'blacklist')}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline"
              >
                Manage
              </button>
            </div>

            <div className="mt-2 space-y-1.5">
              {db.blacklist.slice(0, 2).map((item) => (
                <div key={item.id} className="bg-white border border-rose-200 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-[11px]">{item.nameEn} ({item.nameMm})</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">
                      {item.riskLevel}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    NRC: {item.nrcNumber || 'N/A'} • PB: {item.passbookNumber || 'N/A'}
                  </div>
                  <p className="text-[10px] text-rose-900 mt-0.5 line-clamp-1 italic">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
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
