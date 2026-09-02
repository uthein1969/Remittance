import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  History, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileCode, 
  Server, 
  ShieldCheck, 
  Copy,
  Terminal,
  Clock,
  User,
  Key
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { SUPABASE_SCHEMA_SQL } from '../../lib/supabase';

export const BackupRestoreView: React.FC = () => {
  const { db, language, t, exportDatabaseJson, restoreDatabaseFromJson, syncDataToSupabase, resetToDefaultSeed, currentUser } = useRemittance();

  const [activeTab, setActiveTab] = useState<'backup' | 'audit' | 'supabase'>('backup');
  const [restoreJson, setRestoreJson] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [searchAudit, setSearchAudit] = useState('');

  // Handle Export Backup
  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Remittance_Software_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({
      type: 'success',
      message: language === 'my' ? 'စနစ် ဒေတာဘေ့စ် အရန်သိမ်းဆည်းမှု (Backup) အောင်မြင်စွာ ဒေါင်းလုဒ်ရယူပြီးပါပြီ။' : 'System Database Backup downloaded successfully.'
    });
  };

  // Handle Restore
  const handleRestore = () => {
    if (!restoreJson.trim()) return;
    const success = restoreDatabaseFromJson(restoreJson);
    if (success) {
      setNotification({
        type: 'success',
        message: language === 'my' ? 'ဒေတာများကို အရန်ဖိုင်မှ အောင်မြင်စွာ ပြန်လည် ထည့်သွင်းပြီးပါပြီ (Restored)' : 'Database successfully restored from JSON backup.'
      });
      setRestoreJson('');
    } else {
      setNotification({
        type: 'error',
        message: language === 'my' ? 'JSON ဖိုင် ပုံစံ မမှန်ကန်ပါ (Invalid Backup File Format)' : 'Invalid JSON format or corrupted backup file structure.'
      });
    }
  };

  // Handle File Upload for Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreJson(content);
    };
    reader.readAsText(file);
  };

  // Supabase Sync
  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    const result = await syncDataToSupabase();
    setIsSyncing(false);
    setNotification({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
  };

  // Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const filteredLogs = db.auditLogs.filter(log => {
    if (!searchAudit) return true;
    const q = searchAudit.toLowerCase();
    return (
      log.module.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {language === 'my' ? 'ဒေတာ အရန်သိမ်းဆည်းမှု၊ မှတ်တမ်း နှင့် Supabase' : 'Backup, Audit Trail & Supabase Cloud Sync'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'my' 
              ? 'အရန်သိမ်းဆည်းမှု (Backup/Restore)၊ လုပ်ဆောင်မှုမှတ်တမ်း (All Action Audit Logs) နှင့် Supabase ချိတ်ဆက်မှု' 
              : 'Enterprise disaster recovery, immutable compliance audit trail & Supabase cloud replication'}
          </p>
        </div>

        {/* 3 Tab Switcher */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'backup' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'အရန်သိမ်း/ပြန်ယူ' : 'Backup & Restore'}</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.auditLogs} ({db.auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'supabase' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Supabase Sync</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          notification.type === 'success' 
            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300' 
            : 'bg-rose-950/70 border-rose-500 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TAB 1: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {language === 'my' ? 'ဒေတာ အရန်သိမ်းဆည်းခြင်း (Export Database Backup)' : 'Export Full JSON Backup'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                {language === 'my'
                  ? 'ဘဏ်ခွဲများ၊ အသုံးပြုသူများ၊ မိတ်ဖက်များ၊ ငွေလဲနှုန်းများ၊ နာမည်ပျက်စာရင်း၊ ဖောက်သည်များနှင့် ငွေလွှဲမှတ်တမ်း အားလုံးကို JSON ဖိုင်အဖြစ် ဒေါင်းလုဒ်ရယူနိုင်ပါသည်။'
                  : 'Generates a timestamped, structured JSON archive containing all branches, exchange rates, AML blacklists, customers, and remittance transactions.'}
              </p>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Transactions</span>
                  <strong className="text-white font-mono text-sm">{db.transactions.length}</strong>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Blacklist</span>
                  <strong className="text-rose-400 font-mono text-sm">{db.blacklist.length}</strong>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Customers</span>
                  <strong className="text-sky-400 font-mono text-sm">{db.customers.length}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="w-full mt-4 flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'my' ? 'ဒေတာ အရန်ဖိုင် ဒေါင်းလုဒ်ရယူမည် (Download Backup JSON)' : 'Download Backup File (.json)'}</span>
            </button>
          </div>

          {/* Restore Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                <Upload className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {language === 'my' ? 'အရန်ဖိုင်မှ ပြန်လည်ထည့်သွင်းခြင်း (Restore Database)' : 'Restore From JSON'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                {language === 'my'
                  ? 'ယခင် အရန်သိမ်းထားသော .json ဖိုင်ကို ရွေးချယ်ပြီး စနစ်ထဲသို့ ပြန်လည် ထည့်သွင်းနိုင်ပါသည်။'
                  : 'Upload an existing backup file or paste raw JSON below to overwrite and restore complete database state.'}
              </p>

              <div className="mt-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="mt-3">
                <textarea
                  rows={3}
                  value={restoreJson}
                  onChange={(e) => setRestoreJson(e.target.value)}
                  placeholder="Or paste JSON backup content directly here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-4">
              <button
                onClick={handleRestore}
                disabled={!restoreJson.trim()}
                className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition-colors disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                <span>{language === 'my' ? 'ဒေတာများ ပြန်လည် ထည့်သွင်းမည် (Restore)' : 'Apply Restore'}</span>
              </button>

              <button
                onClick={() => {
                  if (confirm(language === 'my' ? 'မူလနမူနာဒေတာများသို့ ပြန်လည် ပြောင်းလဲမှာ သေချာပါသလား?' : 'Reset to initial sample seed database?')) {
                    resetToDefaultSeed();
                    setNotification({ type: 'success', message: 'Reset to default seed data complete.' });
                  }
                }}
                className="p-3 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 rounded-xl text-slate-400 transition-colors"
                title="Reset to Factory Mock Data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>{language === 'my' ? 'စနစ် လုပ်ဆောင်မှု မှတ်တမ်းများ (Audit Trail)' : 'Complete System Audit Trail'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'my' ? 'စနစ်အတွင်း ပြုလုပ်ခဲ့သော အရေးကြီး လုပ်ဆောင်မှုအားလုံးကို အချိန်နှင့်တကွ မှတ်တမ်းတင်ထားပါသည်' : 'Immutable compliance record of every create, update, approval, and rejection.'}
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">{t.timestamp}</th>
                  <th className="px-4 py-3">{t.user}</th>
                  <th className="px-4 py-3">{t.module}</th>
                  <th className="px-4 py-3">{t.action}</th>
                  <th className="px-4 py-3">{t.details}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-400 font-mono text-[11px]">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-md">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPABASE INTEGRATION & SCHEMA */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black">
                  SB
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Supabase PostgreSQL Cloud Integration
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sync local remittance database, transactions & audit records with Supabase PostgreSQL cloud backend.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSyncSupabase}
                disabled={isSyncing}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Database to Supabase'}</span>
              </button>
            </div>

            {/* Supabase Schema SQL Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-teal-400" />
                  <span>Ready-to-Execute Supabase SQL DDL Script</span>
                </span>
                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-72 text-slate-300 font-mono text-[11px] leading-relaxed">
                <pre>{SUPABASE_SCHEMA_SQL}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
