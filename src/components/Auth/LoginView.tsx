import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Settings, 
  Copy, 
  Check, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Building2
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { User, UserRole } from '../../types';
import { SUPABASE_SCHEMA_SQL, SUPABASE_DISABLE_RLS_SQL, testSupabaseConnection } from '../../lib/supabase';

export const LoginView: React.FC = () => {
  const { 
    db, 
    language, 
    setLanguage, 
    loginWithSupabase, 
    fetchSupabaseUsers, 
    seedUsersToSupabase,
    updateSupabaseConfig 
  } = useRemittance();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Supabase quick info & helper drawers
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showUsersDrawer, setShowUsersDrawer] = useState(true);
  const [supabaseUsers, setSupabaseUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copiedSql, setCopiedSql] = useState<'ddl' | 'rls' | null>(null);
  const [seedingUsers, setSeedingUsers] = useState(false);

  // Connection settings state
  const [cfgUrl, setCfgUrl] = useState(db.supabaseConfig.url || '');
  const [cfgKey, setCfgKey] = useState(db.supabaseConfig.anonKey || '');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConn, setTestingConn] = useState(false);

  // Load existing Supabase users if configured
  const loadRemoteUsers = async () => {
    if (!db.supabaseConfig.url || !db.supabaseConfig.anonKey) return;
    setLoadingUsers(true);
    const res = await fetchSupabaseUsers();
    if (res.success && res.users) {
      setSupabaseUsers(res.users);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    loadRemoteUsers();
  }, [db.supabaseConfig.url, db.supabaseConfig.anonKey]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const result = await loginWithSupabase(usernameOrEmail, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
      if (result.needsConfig) {
        setShowConfigDrawer(true);
      }
    } else {
      setSuccessMessage(result.message);
    }
  };

  const handleQuickSelectUser = (u: User) => {
    setUsernameOrEmail(u.username);
    setPassword('password123');
    setErrorMessage(null);
  };

  const handleCopy = (type: 'ddl' | 'rls') => {
    const text = type === 'ddl' ? SUPABASE_SCHEMA_SQL : SUPABASE_DISABLE_RLS_SQL;
    navigator.clipboard.writeText(text);
    setCopiedSql(type);
    setTimeout(() => setCopiedSql(null), 2500);
  };

  const handleTestAndSaveConfig = async () => {
    if (!cfgUrl.trim() || !cfgKey.trim()) {
      setTestResult({
        success: false,
        message: language === 'my' ? 'URL နှင့် Key ကို ပြည့်စုံစွာ ဖြည့်ပါ' : 'Please fill in both URL and Key'
      });
      return;
    }
    setTestingConn(true);
    const res = await testSupabaseConnection(cfgUrl.trim(), cfgKey.trim());
    setTestingConn(false);
    setTestResult(res);

    if (res.success) {
      updateSupabaseConfig({
        url: cfgUrl.trim(),
        anonKey: cfgKey.trim(),
        isConnected: true,
      });
      setTimeout(() => {
        loadRemoteUsers();
      }, 500);
    }
  };

  const handleSeedUsers = async () => {
    setSeedingUsers(true);
    const res = await seedUsersToSupabase();
    setSeedingUsers(false);
    if (res.success) {
      setSuccessMessage(res.message);
      loadRemoteUsers();
    } else {
      setErrorMessage(res.message);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MAKER': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CHECKER': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'AUDITOR': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Bar: Brand, CBM Badge & Language Switcher */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold text-base sm:text-lg tracking-tight">
                {language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲစနစ်' : 'Remittance Management Portal'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                User Login
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {language === 'my' ? 'မြန်မာနိုင်ငံတော်ဗဟိုဘဏ် စည်းမျဉ်းကိုက် လုံခြုံရေးစနစ်' : 'CBM-Regulated Multi-Currency Settlement Engine'}
            </p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
              language === 'en' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('my')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
              language === 'my' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            မြန်မာ
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Login Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-linear-to-r from-slate-900 to-blue-900 p-6 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  User Login
                </span>
              </div>
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                db.supabaseConfig.isConnected 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
              }`}>
                <div className={`w-2 h-2 rounded-full ${db.supabaseConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{db.supabaseConfig.isConnected ? 'Supabase Connected' : 'DB Not Connected'}</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-2 text-white flex items-center gap-2">
              <Lock className="w-6 h-6 text-blue-400" />
              <span>User Login</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {language === 'my' 
                ? 'Supabase database ရှိ "users" table မှ user အကောင့်ဖြင့် login ဝင်ပါ' 
                : 'Sign in with your verified Supabase user account'}
            </p>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold">{errorMessage}</div>
                  {errorMessage.includes('RLS') && (
                    <button
                      type="button"
                      onClick={() => handleCopy('rls')}
                      className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-700 hover:underline pt-0.5"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{language === 'my' ? 'RLS Disable Script ကူးယူမည်' : 'Copy Disable RLS SQL'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success Message Alert */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {language === 'my' ? 'အသုံးပြုသူ အမည် သို့မဟုတ် အီးမေးလ်' : 'Username or Email'}
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder={language === 'my' ? 'ဥပမာ- admin သို့မဟုတ် maker_thura' : 'e.g. admin or maker_thura'}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {language === 'my' ? 'လျှို့ဝှက်နံပါတ် (Password)' : 'Password / Security PIN'}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Default: <span className="font-mono font-bold text-blue-600">password123</span>
                  </span>
                </div>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'my' ? 'Supabase Table တွင် စစ်ဆေးနေသည်...' : 'Authenticating with Supabase...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{language === 'my' ? 'User Login (ဝင်မည်)' : 'User Login'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Tools & Connection Settings Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="inline-flex items-center space-x-1.5 font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'Supabase Database ချိတ်ဆက်မှု ပြင်ဆင်ရန်' : 'Configure Supabase Database'}</span>
                {showConfigDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => handleCopy('ddl')}
                className="inline-flex items-center space-x-1 font-medium text-slate-500 hover:text-slate-800"
                title="Copy SQL Schema"
              >
                {copiedSql === 'ddl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql === 'ddl' ? 'Copied!' : 'SQL DDL'}</span>
              </button>
            </div>

            {/* Collapsible Supabase Connection Config */}
            {showConfigDrawer && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-800 flex items-center space-x-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span>Supabase Project Connection</span>
                  </div>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>Supabase Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Project URL</label>
                    <input
                      type="text"
                      value={cfgUrl}
                      onChange={(e) => setCfgUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full mt-0.5 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Anon Public Key</label>
                    <input
                      type="password"
                      value={cfgKey}
                      onChange={(e) => setCfgKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full mt-0.5 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono"
                    />
                  </div>
                </div>

                {testResult && (
                  <div className={`p-2 rounded text-[11px] ${testResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {testResult.message}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={seedingUsers}
                    onClick={handleSeedUsers}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center space-x-1"
                    title="Upload standard users into Supabase users table"
                  >
                    {seedingUsers ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>{language === 'my' ? 'User များ ထည့်သွင်းမည် (Seed)' : 'Seed Users to Cloud'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={testingConn}
                    onClick={handleTestAndSaveConfig}
                    className="px-3 py-1 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center space-x-1"
                  >
                    {testingConn ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    <span>{language === 'my' ? 'စမ်းသပ်ပြီး သိမ်းမည်' : 'Test & Save'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Supabase Users Directory & Guidance */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Quick Select Supabase User Accounts */}
          <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 p-5 text-white shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  {language === 'my' ? 'Supabase Table မှ User များ' : 'Users in Supabase Table'}
                </h3>
              </div>
              <button
                onClick={loadRemoteUsers}
                disabled={loadingUsers}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Refresh users from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-2.5 mb-3 leading-relaxed">
              {language === 'my'
                ? 'အောက်ပါအကောင့်များကို နှိပ်၍ အသုံးပြုသူအမည်နှင့် လျှို့ဝှက်နံပါတ်ကို အလိုအလျောက် ဖြည့်သွင်းနိုင်ပါသည်:'
                : 'Click any account below to autofill and verify authentication against Supabase:'}
            </p>

            {/* User List */}
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {(supabaseUsers.length > 0 ? supabaseUsers : db.users).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelectUser(u)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                    usernameOrEmail === u.username
                      ? 'bg-blue-600/30 border-blue-500 ring-1 ring-blue-500/50'
                      : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-100 group-hover:text-blue-300 transition-colors truncate">
                        {u.fullName}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(u.role)}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center space-x-1.5 truncate">
                      <span>@{u.username}</span>
                      <span>•</span>
                      <span>{u.email}</span>
                    </div>
                  </div>

                  <div className="pl-2">
                    <span className="text-[10px] font-semibold text-blue-400 group-hover:text-blue-300 px-2 py-1 rounded bg-blue-950/60 border border-blue-800/60">
                      {language === 'my' ? 'ရွေးမည်' : 'Select'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Helper for Seed Users if remote is empty */}
            {supabaseUsers.length === 0 && db.supabaseConfig.isConnected && (
              <div className="mt-3 p-3 rounded-lg bg-blue-900/30 border border-blue-700/50 text-xs">
                <div className="text-blue-200 font-semibold mb-1">
                  {language === 'my' ? 'Supabase Table တွင် User မရှိသေးပါသလား?' : 'Empty Users Table on Supabase?'}
                </div>
                <p className="text-[11px] text-slate-300 mb-2">
                  {language === 'my'
                    ? 'စနစ်တွင်းရှိ မူလ User (၅) ဦးကို Supabase သို့ ချက်ချင်းထည့်သွင်းနိုင်ပါသည်'
                    : 'Upload 5 pre-configured operator roles (Admin, Maker, Checker, Auditor) to Supabase now.'}
                </p>
                <button
                  type="button"
                  disabled={seedingUsers}
                  onClick={handleSeedUsers}
                  className="w-full py-1.5 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1"
                >
                  {seedingUsers ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{language === 'my' ? 'User စာရင်းကို Supabase သို့ ပို့မည်' : 'Upload Users to Supabase'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Security & RLS Guide */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-slate-200 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{language === 'my' ? 'လုံခြုံရေးနှင့် ခွင့်ပြုချက် (Security Note)' : 'PostgreSQL Security & RLS Policy'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {language === 'my'
                ? 'Supabase တွင် Row-Level Security (RLS) ကြောင့် ဖတ်မရပါက "Copy RLS Script" နှိပ်၍ Supabase SQL Editor တွင် Run ပေးပါရန် လိုအပ်ပါသည်။'
                : 'If Supabase blocks login with a permission error, Row Level Security is active. Run the RLS disable query in your Supabase SQL Editor.'}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy('rls')}
                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-[11px] flex items-center space-x-1 transition-colors"
              >
                {copiedSql === 'rls' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql === 'rls' ? 'Copied!' : 'Copy RLS Script'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy('ddl')}
                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-[11px] flex items-center space-x-1 transition-colors"
              >
                {copiedSql === 'ddl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql === 'ddl' ? 'Copied!' : 'Copy Full DDL'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
