import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  History, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  RefreshCw, 
  FileCode, 
  Server, 
  ShieldCheck, 
  Copy,
  Terminal,
  Clock,
  User,
  Key,
  Search,
  Filter,
  FileSpreadsheet,
  Users,
  Eye,
  EyeOff,
  Globe,
  Unplug,
  Check,
  ExternalLink
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { SUPABASE_SCHEMA_SQL, SUPABASE_DISABLE_RLS_SQL, testSupabaseConnection } from '../../lib/supabase';

export interface BackupRestoreViewProps {
  initialTab?: 'backup' | 'audit' | 'supabase';
  initialModuleFilter?: string;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  initialTab = 'backup',
  initialModuleFilter = 'ALL'
}) => {
  const { 
    db, 
    language, 
    t, 
    exportBackupJson,
    exportDatabaseJson, 
    restoreBackupJson,
    restoreDatabaseFromJson, 
    syncDataToSupabase, 
    fetchDataFromSupabase,
    updateSupabaseConfig,
    resetToDefaultData,
    resetToDefaultSeed, 
    currentUser 
  } = useRemittance();

  const [activeTab, setActiveTab] = useState<'backup' | 'audit' | 'supabase'>(initialTab);
  const [selectedModule, setSelectedModule] = useState<string>(initialModuleFilter);
  const [restoreJson, setRestoreJson] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [searchAudit, setSearchAudit] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Supabase connection state
  const [supabaseUrl, setSupabaseUrl] = useState(db.supabaseConfig.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(db.supabaseConfig.anonKey || '');
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; isRlsBlocked?: boolean } | null>(null);

  useEffect(() => {
    if (db.supabaseConfig.url && !supabaseUrl) {
      setSupabaseUrl(db.supabaseConfig.url);
    }
    if (db.supabaseConfig.anonKey && !supabaseAnonKey) {
      setSupabaseAnonKey(db.supabaseConfig.anonKey);
    }
  }, [db.supabaseConfig.url, db.supabaseConfig.anonKey]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialModuleFilter) {
      setSelectedModule(initialModuleFilter);
    }
  }, [initialModuleFilter]);

  // Helper to obtain backup json string safely
  const getBackupJsonString = (): string => {
    try {
      if (typeof exportBackupJson === 'function') return exportBackupJson();
      if (typeof exportDatabaseJson === 'function') return exportDatabaseJson();
    } catch (e) {
      console.warn('exportBackupJson failed, using fallback db stringify', e);
    }
    return JSON.stringify({ metadata: { exportedAt: new Date().toISOString() }, data: db }, null, 2);
  };

  // Handle Export Backup (direct download)
  const handleDownloadBackup = () => {
    setIsDownloading(true);
    try {
      const jsonStr = getBackupJsonString();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `CBM_Remittance_Backup_${timestamp}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      
      // If browser supports msSaveOrOpenBlob
      if ((window.navigator as any)?.msSaveOrOpenBlob) {
        (window.navigator as any).msSaveOrOpenBlob(blob, filename);
        setIsDownloading(false);
        setNotification({
          type: 'success',
          message: language === 'my'
            ? `စနစ်ဒေတာ အရန်သိမ်းဆည်းမှု (${filename}) အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။`
            : `System backup (${filename}) downloaded successfully.`
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      }, 500);

      // Also copy to clipboard so the user has immediate access if iframe restricts downloads
      try {
        navigator.clipboard.writeText(jsonStr);
      } catch (clipErr) {
        // non-blocking
      }

      setNotification({
        type: 'success',
        message: language === 'my'
          ? `စနစ်ဒေတာ အရန်သိမ်းဆည်းမှု (${filename}) အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။ [Transactions: ${db.transactions.length}, Branches: ${db.branches.length}]`
          : `System backup (${filename}) downloaded successfully. [${db.transactions.length} transactions, ${db.branches.length} branches]`
      });
    } catch (err: any) {
      console.error('Download error:', err);
      setIsDownloading(false);
      
      // Fallback: Copy to clipboard if direct file download is restricted in iframe
      try {
        const jsonStr = getBackupJsonString();
        navigator.clipboard.writeText(jsonStr);
        setNotification({
          type: 'success',
          message: language === 'my'
            ? 'Browser download ကန့်သတ်ချက်ကြောင့် အရန်ဒေတာ JSON ကို Clipboard သို့ အောင်မြင်စွာ ကူးယူပေးထားပါသည် (ဖိုင်ထဲသို့ Paste ပြုလုပ်၍ သိမ်းဆည်းနိုင်ပါသည်)'
            : 'Download restricted by browser iframe, but complete Backup JSON has been copied to your clipboard.'
        });
      } catch (fallbackErr) {
        setNotification({
          type: 'error',
          message: language === 'my'
            ? `ဒေါင်းလုဒ် ရယူရာတွင် အမှားအယွင်း ဖြစ်ပေါ်ပါသည်: ${err?.message || ''}`
            : `Failed to generate download file: ${err?.message || ''}`
        });
      }
    }
  };

  // Copy Full JSON to Clipboard (ideal when browser iframe blocks downloads)
  const handleCopyBackup = () => {
    try {
      const jsonStr = getBackupJsonString();
      navigator.clipboard.writeText(jsonStr);
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2500);
      setNotification({
        type: 'success',
        message: language === 'my'
          ? 'ဒေတာ အရန်ဖိုင် JSON အချက်အလက်များကို Clipboard ပေါ်သို့ အောင်မြင်စွာ ကူးယူပြီးပါပြီ (Copied)'
          : 'Complete database JSON backup copied to clipboard successfully!'
      });
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  // Export Audit Trail to CSV
  const handleExportAuditCsv = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Target ID', 'Details'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${l.userRole || ''}"`,
      `"${l.entityType || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.entityId || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Trail_${selectedModule}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 300);
  };

  // Handle Restore
  const handleRestore = () => {
    if (!restoreJson.trim()) return;
    const success = restoreDatabaseFromJson(restoreJson);
    if (success) {
      setNotification({
        type: 'success',
        message: language === 'my' 
          ? 'ဒေတာများကို အရန်ဖိုင်မှ အောင်မြင်စွာ ပြန်လည် ထည့်သွင်းပြီးပါပြီ (Database Restored Successfully)' 
          : 'Database successfully restored from JSON backup.'
      });
      setRestoreJson('');
      setUploadedFileName('');
    } else {
      setNotification({
        type: 'error',
        message: language === 'my' 
          ? 'JSON ဖိုင် ပုံစံ မမှန်ကန်ပါ (Invalid Backup File Format)' 
          : 'Invalid JSON format or corrupted backup file structure.'
      });
    }
  };

  // Handle File Upload for Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreJson(content);
      setNotification({
        type: 'success',
        message: language === 'my'
          ? `ဖိုင် "${file.name}" ကို ဖတ်ရှုပြီးပါပြီ။ "ဒေတာများ ပြန်လည် ထည့်သွင်းမည် (Apply Restore)" ခလုတ်ကို နှိပ်ပါ`
          : `File "${file.name}" loaded. Click "Apply Restore" to complete.`
      });
    };
    reader.readAsText(file);
  };

  // Supabase Sync (Push)
  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    const result = await syncDataToSupabase();
    setIsSyncing(false);
    setNotification({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
  };

  // Supabase Pull (Fetch)
  const handlePullSupabase = async () => {
    setIsPulling(true);
    const result = await fetchDataFromSupabase();
    setIsPulling(false);
    setNotification({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
  };

  // Test Supabase Connection
  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({
        success: false,
        message: language === 'my' 
          ? 'ကျေးဇူးပြု၍ Supabase URL နှင့် Anon Key နှစ်ခုစလုံးကို ထည့်သွင်းပါ' 
          : 'Please enter both Supabase URL and Anon API Key'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      updateSupabaseConfig({
        url: supabaseUrl.trim(),
        anonKey: supabaseAnonKey.trim(),
        isConnected: true,
      });
      setNotification({
        type: 'success',
        message: language === 'my' 
          ? 'Supabase Cloud Database သို့ အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ!' 
          : 'Successfully connected to Supabase Cloud Database!'
      });
    } else {
      setNotification({
        type: 'error',
        message: result.message
      });
    }
  };

  // Save Supabase Config
  const handleSaveConfig = () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setNotification({
        type: 'error',
        message: language === 'my' 
          ? 'Supabase URL နှင့် Anon Key ကို ထည့်သွင်းပေးပါ' 
          : 'Please enter both Supabase URL and Anon Key'
      });
      return;
    }

    updateSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
      isConnected: true,
    });

    setNotification({
      type: 'success',
      message: language === 'my'
        ? 'Supabase Database ချိတ်ဆက်မှု အချက်အလက်များ သိမ်းဆည်းပြီးပါပြီ'
        : 'Supabase Database credentials saved successfully'
    });
  };

  // Disconnect Supabase
  const handleDisconnect = () => {
    updateSupabaseConfig({
      url: '',
      anonKey: '',
      isConnected: false,
      syncStatus: 'IDLE',
    });
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setTestResult(null);
    setNotification({
      type: 'success',
      message: language === 'my' ? 'Supabase ချိတ်ဆက်မှုကို ဖြတ်တောက်လိုက်ပါပြီ' : 'Disconnected from Supabase'
    });
  };

  // Copy Schema SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Copy RLS SQL
  const handleCopyRlsSql = () => {
    navigator.clipboard.writeText(SUPABASE_DISABLE_RLS_SQL);
    setCopiedRlsSql(true);
    setTimeout(() => setCopiedRlsSql(false), 2000);
    setNotification({
      type: 'success',
      message: language === 'my' ? 'RLS Disable SQL ကို Copy ကူးပြီးပါပြီ' : 'Copied RLS Disable SQL script'
    });
  };

  const auditModules = [
    { key: 'ALL', labelEn: 'All Modules', labelMm: 'အားလုံး' },
    { key: 'USER', labelEn: 'Users', labelMm: 'အသုံးပြုသူများ' },
    { key: 'BRANCH', labelEn: 'Branches', labelMm: 'ဘဏ်ခွဲများ' },
    { key: 'OUTWARD', labelEn: 'Outward Remit', labelMm: 'ငွေလွှဲပို့ခြင်း' },
    { key: 'INWARD', labelEn: 'Inward Remit', labelMm: 'ငွေလွှဲထုတ်ခြင်း' },
    { key: 'EXCHANGE_RATE', labelEn: 'Exchange Rate', labelMm: 'ငွေလဲနှုန်း' },
    { key: 'PURPOSE', labelEn: 'Purpose', labelMm: 'ရည်ရွယ်ချက်များ' },
    { key: 'BLACKLIST', labelEn: 'Blacklist', labelMm: 'နာမည်ပျက်' },
    { key: 'CUSTOMER', labelEn: 'Customers', labelMm: 'ဖောက်သည်များ' },
    { key: 'SYSTEM', labelEn: 'System', labelMm: 'စနစ်' },
  ];

  const filteredLogs = db.auditLogs.filter(log => {
    if (selectedModule !== 'ALL' && log.entityType !== selectedModule) {
      return false;
    }
    if (!searchAudit) return true;
    const q = searchAudit.toLowerCase();
    return (
      (log.entityType || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.userName || '').toLowerCase().includes(q) ||
      (log.entityId || '').toLowerCase().includes(q) ||
      (log.userRole || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shadow-xs">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{language === 'my' ? 'ဒေတာ အရန်သိမ်းဆည်းမှု၊ မှတ်တမ်း နှင့် Cloud Sync' : 'Backup, Audit Trail & Supabase Cloud Sync'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'my' 
                  ? 'အရန်သိမ်းဆည်းမှု (Backup/Restore)၊ လုပ်ဆောင်ချက် မှတ်တမ်းအားလုံး (Audit Trail) နှင့် Supabase ချိတ်ဆက်မှု' 
                  : 'Enterprise disaster recovery, immutable compliance audit trail & Supabase cloud replication'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Controls: 3 Tab Switcher */}
        <div className="flex items-center">
          <div className="flex items-center bg-slate-950/90 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold shadow-inner gap-1">
            <button
              type="button"
              id="tab-btn-backup-restore"
              onClick={() => setActiveTab('backup')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'backup' 
                  ? 'bg-emerald-600 text-white shadow-md font-bold border border-emerald-500/40' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={language === 'my' ? 'အရန်သိမ်းဆည်းမှု နှင့် ပြန်လည်ရယူခြင်း ကဏ္ဍ' : 'Switch to Backup & Restore view'}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'အရန်သိမ်း/ပြန်ယူ (Backup & Restore)' : 'Backup & Restore'}</span>
            </button>

            <button
              type="button"
              id="tab-btn-audit-trail"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'audit' 
                  ? 'bg-indigo-600 text-white shadow-md font-bold border border-indigo-500/40' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={language === 'my' ? 'လုပ်ဆောင်ချက်မှတ်တမ်းများ ကဏ္ဍ' : 'Switch to Audit Trail'}
            >
              <History className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'မှတ်တမ်း (Audit Trail)' : 'Audit Trail'} ({db.auditLogs.length})</span>
            </button>

            <button
              type="button"
              id="tab-btn-supabase-sync"
              onClick={() => setActiveTab('supabase')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'supabase' 
                  ? 'bg-teal-600 text-white shadow-md font-bold border border-teal-500/40' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={language === 'my' ? 'Supabase Cloud ချိတ်ဆက်မှု ကဏ္ဍ' : 'Switch to Supabase Cloud Sync'}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Supabase Cloud</span>
            </button>
          </div>
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

            {/* Action buttons */}
            <div className="space-y-2 mt-4">
              <button
                type="button"
                id="btn-card-download-backup"
                onClick={handleDownloadBackup}
                disabled={isDownloading}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] cursor-pointer"
              >
                <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>{isDownloading ? (language === 'my' ? 'ဒေါင်းလုဒ် ပြုလုပ်နေပါသည်...' : 'Generating Backup File...') : (language === 'my' ? 'ဒေတာ အရန်ဖိုင် ဒေါင်းလုဒ်ရယူမည် (Download Backup JSON)' : 'Download Backup File (.json)')}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="btn-card-copy-backup"
                  onClick={handleCopyBackup}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>{copiedBackup ? (language === 'my' ? 'ကူးယူပြီးပါပြီ (Copied)' : 'Copied!') : (language === 'my' ? 'JSON အချက်အလက်များ Copy ကူးမည်' : 'Copy JSON to Clipboard')}</span>
                </button>

                <button
                  type="button"
                  id="btn-card-toggle-preview"
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  title="Toggle JSON Preview"
                >
                  <FileCode className="w-3.5 h-3.5" />
                </button>
              </div>

              {showJsonPreview && (
                <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto">
                  <pre>{getBackupJsonString().slice(0, 1500)}...</pre>
                </div>
              )}
            </div>
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
                  id="input-file-restore"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
                {uploadedFileName && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Loaded: {uploadedFileName}</span>
                  </p>
                )}
              </div>

              <div className="mt-3">
                <textarea
                  rows={3}
                  id="textarea-json-restore"
                  value={restoreJson}
                  onChange={(e) => setRestoreJson(e.target.value)}
                  placeholder={language === 'my' ? 'သို့မဟုတ် JSON backup ကုဒ်များကို ဤနေရာတွင် paste ချပါ...' : 'Or paste JSON backup content directly here...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-4">
              <button
                type="button"
                id="btn-apply-restore"
                onClick={handleRestore}
                disabled={!restoreJson.trim()}
                className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{language === 'my' ? 'ဒေတာများ ပြန်လည် ထည့်သွင်းမည် (Restore)' : 'Apply Restore'}</span>
              </button>

              <button
                type="button"
                id="btn-reset-default-data"
                onClick={() => {
                  resetToDefaultSeed();
                  setNotification({
                    type: 'success',
                    message: language === 'my' 
                      ? 'မူလနမူနာဒေတာများသို့ ပြန်လည်ပြောင်းလဲပြီးပါပြီ (Reset to default seed data complete)' 
                      : 'Reset to default seed data complete.'
                  });
                }}
                className="p-3 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 rounded-xl text-slate-400 transition-colors cursor-pointer"
                title={language === 'my' ? 'မူလနမူနာဒေတာများသို့ ပြန်ထားမည်' : 'Reset to Factory Mock Data'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <span>{language === 'my' ? 'စနစ် လုပ်ဆောင်မှု မှတ်တမ်းများ (Audit Trail)' : 'Complete System Audit Trail'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'my' 
                  ? 'User အသစ်သွင်းခြင်း၊ ငွေလွှဲပြင်ဆင်ခြင်း၊ အတည်ပြုခြင်း စသည့် စနစ်တွင်း လုပ်ဆောင်ချက်အားလုံးကို အချိန်နှင့်တကွ အပြည့်အစုံ မှတ်တမ်းတင်ထားပါသည်' 
                  : 'Immutable compliance record of every create, update, approval, and rejection across all modules.'}
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  placeholder={language === 'my' ? 'မှတ်တမ်း ရှာဖွေရန်...' : 'Search logs, user, target...'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shrink-0 transition-colors shadow-xs"
                title="Export Audit Trail to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Module Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>{language === 'my' ? 'ကဏ္ဍ:' : 'Module:'}</span>
            </span>
            {auditModules.map(mod => {
              const count = mod.key === 'ALL' 
                ? db.auditLogs.length 
                : db.auditLogs.filter(l => l.entityType === mod.key).length;
              const isSelected = selectedModule === mod.key;

              return (
                <button
                  key={mod.key}
                  onClick={() => setSelectedModule(mod.key)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{language === 'my' ? mod.labelMm : mod.labelEn}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">{t.timestamp}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t.user}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t.module}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t.action}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{language === 'my' ? 'ပစ်မှတ် (Target)' : 'Target ID'}</th>
                  <th className="px-4 py-3">{t.details}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <History className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                        <span>{language === 'my' ? 'မှတ်တမ်း မတွေ့ရှိပါ' : 'No matching audit records found'}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const isCreate = log.action === 'CREATE';
                    const isUpdate = log.action === 'UPDATE';
                    const isDelete = log.action === 'DELETE';
                    const isApprove = log.action === 'APPROVE';
                    const isReject = log.action === 'REJECT';
                    const isLogin = log.action === 'LOGIN';

                    const actionColorClass = 
                      isCreate ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                      isUpdate ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                      isDelete ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      isApprove ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :
                      isReject ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      isLogin ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                      'bg-slate-800 text-slate-300 border-slate-700';

                    const moduleColorClass =
                      log.entityType === 'USER' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' :
                      log.entityType === 'BRANCH' ? 'bg-blue-900/40 text-blue-300 border-blue-800/50' :
                      log.entityType === 'OUTWARD' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50' :
                      log.entityType === 'INWARD' ? 'bg-teal-900/40 text-teal-300 border-teal-800/50' :
                      log.entityType === 'EXCHANGE_RATE' ? 'bg-amber-900/40 text-amber-300 border-amber-800/50' :
                      log.entityType === 'PURPOSE' ? 'bg-indigo-900/40 text-indigo-300 border-indigo-800/50' :
                      log.entityType === 'BLACKLIST' ? 'bg-rose-900/40 text-rose-300 border-rose-800/50' :
                      'bg-slate-800 text-slate-300 border-slate-700';

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <strong className="text-slate-200 font-semibold">{log.userName}</strong>
                            {log.userRole && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                {log.userRole}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${moduleColorClass}`}>
                            {log.entityType}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${actionColorClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                          {log.entityId ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                              {log.entityId}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-md leading-relaxed">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPABASE INTEGRATION & SCHEMA */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          {/* Top Status & Action Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-black text-lg">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">
                      Supabase PostgreSQL Cloud Integration
                    </h3>
                    {db.supabaseConfig.isConnected ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Connected & Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <span>Not Connected</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'my'
                      ? 'ပြည်တွင်း/ပြည်ပ ငွေလွှဲဒေတာ၊ အသုံးပြုသူများနှင့် Audit Log များကို Supabase Cloud Database နှင့် ချိတ်ဆက်သိမ်းဆည်းခြင်း'
                      : 'Synchronize local remittance transactions, users and audit trails with your remote Supabase PostgreSQL database.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-supabase-push"
                  onClick={handleSyncSupabase}
                  disabled={isSyncing || !db.supabaseConfig.isConnected}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? (language === 'my' ? 'ပို့နေသည်...' : 'Pushing...') : (language === 'my' ? 'ဒေတာများ Supabase သို့ ပို့မည်' : 'Push Data to Cloud')}</span>
                </button>

                <button
                  id="btn-supabase-pull"
                  onClick={handlePullSupabase}
                  disabled={isPulling || !db.supabaseConfig.isConnected}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>{isPulling ? (language === 'my' ? 'ရယူနေသည်...' : 'Pulling...') : (language === 'my' ? 'Cloud မှ ပြန်ယူမည်' : 'Pull Data from Cloud')}</span>
                </button>
              </div>
            </div>

            {/* Connection Information Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-400 text-[11px] font-semibold">Project Endpoint</div>
                <div className="font-mono text-slate-200 truncate mt-1">
                  {db.supabaseConfig.url ? (
                    <span className="text-teal-400 font-medium">{db.supabaseConfig.url}</span>
                  ) : (
                    <span className="text-slate-400 italic">Not configured yet</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-400 text-[11px] font-semibold">Last Synchronization</div>
                <div className="font-mono text-slate-200 mt-1">
                  {db.supabaseConfig.lastSyncTime ? (
                    <span className="text-emerald-400">
                      {new Date(db.supabaseConfig.lastSyncTime).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Never synced</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-400 text-[11px] font-semibold">Sync Status</div>
                <div className="mt-1 flex items-center space-x-1.5">
                  {db.supabaseConfig.syncStatus === 'SUCCESS' && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized
                    </span>
                  )}
                  {db.supabaseConfig.syncStatus === 'SYNCING' && (
                    <span className="text-teal-400 font-semibold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress...
                    </span>
                  )}
                  {db.supabaseConfig.syncStatus === 'ERROR' && (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Error Reported
                    </span>
                  )}
                  {(!db.supabaseConfig.syncStatus || db.supabaseConfig.syncStatus === 'IDLE') && (
                    <span className="text-slate-400">Idle / Ready</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Credentials Form & Test Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Server className="w-5 h-5 text-teal-400" />
                <h4 className="text-sm font-bold text-white">
                  {language === 'my' ? 'Supabase Database ချိတ်ဆက်မှု အချက်အလက်များ' : 'Supabase Project Credentials'}
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                {language === 'my' ? 'Supabase Dashboard မှ API settings ကို ထည့်သွင်းပါ' : 'From Supabase Dashboard -> Settings -> API'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    <span>Supabase Project URL</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">https://*.supabase.co</span>
                </label>
                <input
                  id="input-supabase-url"
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              {/* Anon API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-400" />
                    <span>Project API Key (anon / public)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAnonKey(!showAnonKey)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showAnonKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showAnonKey ? 'Hide' : 'Show'}</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    id="input-supabase-anon-key"
                    type={showAnonKey ? 'text' : 'password'}
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500 transition-colors pr-10"
                  />
                </div>
              </div>
            </div>

            {/* Test Result Message Banner */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 transition-all ${
                  testResult.success
                    ? testResult.isRlsBlocked
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                {testResult.success ? (
                  testResult.isRlsBlocked ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="font-semibold">{testResult.message}</div>
                  {testResult.isRlsBlocked && (
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={handleCopyRlsSql}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[11px] font-bold border border-amber-500/40"
                      >
                        Copy RLS Disable Script
                      </button>
                      <span className="text-[11px] text-amber-300/80">
                        Paste and run in Supabase SQL Editor to allow anonymous client syncing.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="btn-supabase-test"
                  onClick={handleTestConnection}
                  disabled={isTesting || !supabaseUrl || !supabaseAnonKey}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs rounded-xl border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? (language === 'my' ? 'စမ်းသပ်နေသည်...' : 'Testing...') : (language === 'my' ? 'ချိတ်ဆက်မှု စမ်းသပ်မည်' : 'Test Connection')}</span>
                </button>

                <button
                  id="btn-supabase-save"
                  onClick={handleSaveConfig}
                  disabled={!supabaseUrl || !supabaseAnonKey}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'ချိတ်ဆက်မှု သိမ်းဆည်းမည်' : 'Save Connection'}</span>
                </button>
              </div>

              {db.supabaseConfig.isConnected && (
                <button
                  id="btn-supabase-disconnect"
                  onClick={handleDisconnect}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'ဖြတ်တောက်မည်' : 'Disconnect'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Database Entities Sync Status Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Database className="w-5 h-5 text-teal-400" />
                <h4 className="text-sm font-bold text-white">
                  {language === 'my' ? 'Database Entities အခြေအနေ (11 Tables)' : 'Database Entities & Replicated Tables (11 Tables)'}
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                PostgreSQL Schema
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {[
                { name: 'branches', label: 'Branches (ဘဏ်ခွဲများ)', count: db.branches.length },
                { name: 'users', label: 'Users (အသုံးပြုသူများ)', count: db.users.length },
                { name: 'companies', label: 'Companies (မိတ်ဖက်များ)', count: db.companies.length },
                { name: 'currencies', label: 'Currencies (ငွေကြေးများ)', count: db.currencies.length },
                { name: 'countries', label: 'Countries (နိုင်ငံများ)', count: db.countries.length },
                { name: 'exchange_rates', label: 'Exchange Rates (လဲလှယ်နှုန်း)', count: db.exchangeRates.length },
                { name: 'blacklist', label: 'Blacklist (နာမည်ပျက်)', count: db.blacklist.length },
                { name: 'purposes', label: 'Purposes (ရည်ရွယ်ချက်များ)', count: db.purposes.length },
                { name: 'customers', label: 'Customers (ဖောက်သည်များ)', count: db.customers.length },
                { name: 'transactions', label: 'Transactions (ငွေလွှဲမှတ်တမ်း)', count: db.transactions.length },
                { name: 'audit_logs', label: 'Audit Logs (စစ်ဆေးမှုမှတ်တမ်း)', count: db.auditLogs.length },
              ].map((item) => (
                <div key={item.name} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-teal-400 font-semibold text-[11px]">{item.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                      {item.count}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RLS Troubleshooting & 1-Click Fix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {language === 'my' ? 'Row Level Security (RLS) ဖြေရှင်းနည်း' : 'Row Level Security (RLS) Configuration'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === 'my' 
                      ? 'Supabase တွင် Table များတည်ဆောက်ပြီးပါက Anon Client ဖြင့် ဒေတာများ ချိတ်ဆက်နိုင်ရန် RLS ကို Disable လုပ်ရန် လိုအပ်ပါသည်' 
                      : 'By default, PostgreSQL tables have RLS enabled which blocks anon inserts. Run this script to grant read/write access.'}
                  </p>
                </div>
              </div>

              <button
                id="btn-copy-rls-sql"
                onClick={handleCopyRlsSql}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/30 transition-all cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedRlsSql ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'RLS Script ကို Copy ကူးမည်' : 'Copy RLS Script')}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 overflow-x-auto max-h-48 text-amber-200/90 font-mono text-[11px] leading-relaxed">
              <pre>{SUPABASE_DISABLE_RLS_SQL}</pre>
            </div>
          </div>

          {/* Supabase Schema SQL Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-5 h-5 text-teal-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {language === 'my' ? 'Supabase Table တည်ဆောက်ရန် SQL Script (DDL)' : 'Ready-to-Execute Supabase SQL DDL Script'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === 'my'
                      ? 'Supabase SQL Editor ထဲတွင် ဤ Script ကို paste လုပ်ပြီး Run နိုင်ပါသည်'
                      : 'Paste and run in Supabase SQL Editor to create all 11 tables and indexes.'}
                  </p>
                </div>
              </div>

              <button
                id="btn-copy-full-sql"
                onClick={handleCopySql}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSql ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'SQL အားလုံး Copy ကူးမည်' : 'Copy Full SQL Script')}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-72 text-slate-300 font-mono text-[11px] leading-relaxed">
              <pre>{SUPABASE_SCHEMA_SQL}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

