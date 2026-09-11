import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Copy,
  ExternalLink,
  Server,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import {
  fetchTursoStatus,
  testTursoConnection,
  pushDataToTurso,
  pullDataFromTurso,
  fetchTursoSchema,
  TursoStatusResponse
} from '../../lib/tursoClient';

interface TursoSyncTabProps {
  onNotify: (type: 'success' | 'error', message: string) => void;
}

export const TursoSyncTab: React.FC<TursoSyncTabProps> = ({ onNotify }) => {
  const { db, setDb, language } = useRemittance();
  const [status, setStatus] = useState<TursoStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; isRemote?: boolean; url?: string } | null>(null);
  const [schemaSql, setSchemaSql] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetchTursoStatus();
      setStatus(res);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchema = async () => {
    try {
      const sql = await fetchTursoSchema();
      setSchemaSql(sql);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStatus();
    loadSchema();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testTursoConnection();
      setTestResult(res);
      if (res.success) {
        onNotify('success', language === 'my' 
          ? `Turso ချိတ်ဆက်မှု အောင်မြင်ပါသည်! (${res.isRemote ? 'Remote Turso Cloud' : 'Local Embedded SQLite'})` 
          : `Turso connection successful! (${res.isRemote ? 'Remote Turso Cloud' : 'Local Embedded SQLite'})`);
      } else {
        onNotify('error', res.message || 'Connection failed');
      }
      await loadStatus();
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushData = async () => {
    setIsSyncing(true);
    try {
      const res = await pushDataToTurso({
        transactions: db.transactions,
        exchangeRates: db.exchangeRates,
        customers: db.customers,
        auditLogs: db.auditLogs,
      });

      if (res.success) {
        await loadStatus();
        onNotify(
          'success',
          language === 'my'
            ? `Turso Database သို့ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ! (ငွေလွှဲမှတ်တမ်း: ${res.saved?.transactions || 0}, ငွေလဲနှုန်း: ${res.saved?.exchangeRates || 0}, ဖောက်သည်: ${res.saved?.customers || 0})`
            : `Successfully pushed data to Turso! (${res.saved?.transactions || 0} transactions, ${res.saved?.exchangeRates || 0} rates, ${res.saved?.customers || 0} customers)`
        );
      } else {
        onNotify('error', res.error || 'Failed to push data to Turso');
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Sync error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullData = async () => {
    setIsPulling(true);
    try {
      const res = await pullDataFromTurso();
      if (res.success && res.data) {
        const pulledTxCount = res.data.transactions?.length || 0;
        const pulledRateCount = res.data.exchangeRates?.length || 0;
        const pulledCustCount = res.data.customers?.length || 0;

        if (pulledTxCount > 0 || pulledRateCount > 0 || pulledCustCount > 0) {
          setDb((prev) => {
            const updated = { ...prev };
            if (res.data.transactions?.length > 0) {
              const existingIds = new Set(prev.transactions.map((t) => t.id));
              const newTxs = res.data.transactions.filter((t: any) => !existingIds.has(t.id));
              updated.transactions = [...res.data.transactions, ...prev.transactions.filter((t) => !res.data.transactions.some((rt: any) => rt.id === t.id))];
            }
            if (res.data.exchangeRates?.length > 0) {
              updated.exchangeRates = res.data.exchangeRates;
            }
            if (res.data.customers?.length > 0) {
              updated.customers = res.data.customers;
            }
            return updated;
          });
        }

        await loadStatus();
        onNotify(
          'success',
          language === 'my'
            ? `Turso မှ အချက်အလက်များ အောင်မြင်စွာ ရယူပြီးပါပြီ! (${pulledTxCount} transactions, ${pulledRateCount} exchange rates)`
            : `Successfully pulled data from Turso! (${pulledTxCount} transactions, ${pulledRateCount} exchange rates)`
        );
      } else {
        onNotify('error', res.error || 'Failed to pull data from Turso');
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Sync pull error');
    } finally {
      setIsPulling(false);
    }
  };

  const copySql = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    onNotify('success', language === 'my' ? 'Turso Schema SQL ကို Copy ကူးပြီးပါပြီ' : 'Turso Schema SQL copied to clipboard');
  };

  const copyCliCommands = () => {
    const cliCommands = `# 1. Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Login to Turso
turso auth login

# 3. Create a free database
turso db create remittance-db

# 4. Get Database URL
turso db show remittance-db --url

# 5. Create an authentication token
turso db tokens create remittance-db`;

    navigator.clipboard.writeText(cliCommands);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
    onNotify('success', language === 'my' ? 'Turso CLI commands များကို Copy ကူးပြီးပါပြီ' : 'Turso CLI commands copied');
  };

  const isRemote = status?.isRemote || false;
  const isConnected = status?.connected || false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Turso Overview */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/40 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Turso LibSQL Cloud Database
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FREE 9GB TIER
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  SQLite Compatible
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                {language === 'my'
                  ? 'Turso သည် SQLite အခြေခံ Serverless Cloud Database ဖြစ်ပြီး 9GB အခမဲ့ သိုလှောင်ခွင့်နှင့် အလွန်မြန်ဆန်သော LibSQL engine ပါဝင်ပါသည်။ စနစ်သည် Local Embedded SQLite ဖြင့် အဆင်သင့် စတင်အလုပ်လုပ်ပြီး Remote Turso URL ထည့်သွင်းရုံဖြင့် Cloud Database အဖြစ် ပြောင်းလဲအသုံးပြုနိုင်ပါသည်။'
                  : 'Turso is a fast SQLite-compatible cloud database offering 9GB free storage with LibSQL engine. The app works instantly with an embedded engine, and automatically switches to remote cloud when configured.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? (language === 'my' ? 'စစ်ဆေးနေသည်...' : 'Testing...') : (language === 'my' ? 'Connection စမ်းသပ်မည်' : 'Test Connection')}</span>
            </button>

            <a
              href="https://turso.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <span>turso.tech</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>

        {/* Live Status Pill Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ချိတ်ဆက်မှု အခြေအနေ' : 'Connection Status'}
            </span>
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-xs font-bold text-white">
                {isConnected 
                  ? (isRemote ? 'Remote Turso Cloud' : 'Embedded SQLite Engine') 
                  : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ငွေလွှဲမှတ်တမ်း (Transactions)' : 'Stored Transactions'}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-emerald-400">
                {status?.counts?.transactions ?? db.transactions.length}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">records</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ဖောက်သည် စာရင်း (Customers)' : 'Customers Profile'}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-sky-400">
                {status?.counts?.customers ?? db.customers.length}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">records</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ငွေလဲနှုန်းများ (Exchange Rates)' : 'Exchange Rates'}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-amber-400">
                {status?.counts?.exchangeRates ?? db.exchangeRates.length}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">currencies</span>
            </div>
          </div>
        </div>

        {/* Endpoint address info */}
        {status?.url && (
          <div className="mt-3 flex items-center justify-between bg-slate-950/50 border border-slate-800/80 px-3.5 py-2 rounded-xl text-[11px] text-slate-400">
            <div className="flex items-center space-x-2 truncate">
              <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500">Database Source:</span>
              <span className="font-mono text-slate-300 truncate">{status.url}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono shrink-0 ml-2">
              {isRemote ? 'Cloud Hosted' : 'Embedded Local DB'}
            </span>
          </div>
        )}
      </div>

      {/* Main Two-Column Sync Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Push to Turso Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {language === 'my' ? 'ဒေတာများကို Turso သို့ ပို့မည် (Push Local to Turso)' : 'Push Local Data to Turso'}
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {language === 'my'
                ? 'လက်ရှိ Remittance စနစ်အတွင်းရှိ ငွေလွှဲမှတ်တမ်းများ၊ ငွေလဲနှုန်းများ၊ Customer profiles နှင့် Audit logs အားလုံးကို Turso Database ထဲသို့ ပို့ဆောင်သိမ်းဆည်းပါမည် (Upsert/Save).'
                : 'Uploads all local transactions, exchange rates, customer profiles, and audit records into Turso LibSQL.'}
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mt-4 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Transactions to Push:</span>
                <span className="text-white font-bold">{db.transactions.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Exchange Rates to Push:</span>
                <span className="text-white font-bold">{db.exchangeRates.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Customer Records to Push:</span>
                <span className="text-white font-bold">{db.customers.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Audit Records to Push:</span>
                <span className="text-white font-bold">{db.auditLogs.length}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-turso-push"
            onClick={handlePushData}
            disabled={isSyncing}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>
              {isSyncing
                ? (language === 'my' ? 'Turso သို့ ပို့ဆောင်နေပါသည်...' : 'Pushing Data to Turso...')
                : (language === 'my' ? 'Turso သို့ ဒေတာများ သိမ်းဆည်းမည် (Push to Turso)' : 'Push Data to Turso Database')}
            </span>
          </button>
        </div>

        {/* Pull from Turso Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <DownloadCloud className="w-5 h-5 text-sky-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {language === 'my' ? 'Turso မှ ဒေတာများ ဆွဲယူမည် (Pull from Turso)' : 'Pull Data from Turso'}
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {language === 'my'
                ? 'Turso Database ထဲတွင် သိမ်းဆည်းထားသော အချက်အလက်များကို Remittance System ထဲသို့ ပြန်လည်ဆွဲယူပြီး ရောစပ်ဖြည့်သွင်းပါမည် (Merge & Refresh).'
                : 'Pulls cloud-stored transactions, exchange rates, and customers from Turso and merges them with the local active state.'}
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mt-4 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Cloud Transactions:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.transactions ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Exchange Rates:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.exchangeRates ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Customers:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.customers ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Audit Records:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.auditLogs ?? 'Check'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-turso-pull"
            onClick={handlePullData}
            disabled={isPulling}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
            <span>
              {isPulling
                ? (language === 'my' ? 'Turso မှ ဒေတာများ ဆွဲယူနေပါသည်...' : 'Pulling Data from Turso...')
                : (language === 'my' ? 'Turso မှ ဒေတာများ ရယူမည် (Pull from Turso)' : 'Pull Data from Turso Database')}
            </span>
          </button>
        </div>
      </div>

      {/* Setup Guide: How to configure remote Turso Cloud */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'my' ? 'အခမဲ့ Turso Cloud Database ချိတ်ဆက်အသုံးပြုနည်း (Quick Guide)' : 'How to Connect Free Remote Turso Cloud Database'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'Turso တွင် Account ဖွင့်ပြီး URL နှင့် Token ကို Environment Variable ထဲ ထည့်သွင်းရုံဖြင့် Cloud စနစ်အပြည့်အဝ ရရှိနိုင်ပါသည်'
                  : 'Create a free database on Turso and supply the credentials in environment settings.'}
              </p>
            </div>
          </div>

          <button
            onClick={copyCliCommands}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedCli ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'CLI အမိန့်များ ကူးယူမည်' : 'Copy CLI Commands')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[11px]">1</span>
              <span>Create Account</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {language === 'my'
                ? 'turso.tech သို့ သွား၍ GitHub ဖြင့် အခမဲ့ Sign Up ပြုလုပ်ပါ (Starter Plan သည် အမြဲအခမဲ့ ဖြစ်ပါသည်)'
                : 'Visit turso.tech and sign up for free using GitHub or email.'}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-teal-400 font-bold">
              <span className="w-5 h-5 rounded-full bg-teal-950 border border-teal-500/40 flex items-center justify-center text-[11px]">2</span>
              <span>Create Database</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {language === 'my'
                ? 'Turso Web Dashboard သို့မဟုတ် CLI ဖြင့် "remittance-db" အမည်ရှိ Database အသစ်တစ်ခု တည်ဆောက်ပါ'
                : 'Create a new database named "remittance-db" via Turso CLI or web dashboard.'}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-sky-400 font-bold">
              <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-500/40 flex items-center justify-center text-[11px]">3</span>
              <span>Set Environment Variables</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {language === 'my'
                ? 'TURSO_DATABASE_URL နှင့် TURSO_AUTH_TOKEN ကို App Settings / .env ထဲ ထည့်သွင်းလိုက်ပါက Remote Cloud သို့ အလိုအလျောက် ချိတ်ဆက်သွားပါမည်'
                : 'Provide TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in app settings.'}
            </p>
          </div>
        </div>
      </div>

      {/* Turso Schema SQL DDL Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'my' ? 'Turso LibSQL Table တည်ဆောက်ရန် Schema (DDL)' : 'Turso LibSQL Schema (DDL)'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'ဤ Schema ကို Turso CLI Shell (turso db shell) သို့မဟုတ် DBeaver/TablePlus တွင်လည်း တိုက်ရိုက် run နိုင်ပါသည်'
                  : 'Ready-to-run SQLite/LibSQL DDL for tables, indexes and constraints.'}
              </p>
            </div>
          </div>

          <button
            id="btn-copy-turso-sql"
            onClick={copySql}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedSql ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'SQL Copy ကူးမည်' : 'Copy Turso SQL')}</span>
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-72 text-emerald-200/90 font-mono text-[11px] leading-relaxed">
          <pre>{schemaSql || '-- Loading Turso LibSQL Schema...'}</pre>
        </div>
      </div>
    </div>
  );
};
