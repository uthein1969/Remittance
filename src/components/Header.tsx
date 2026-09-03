import React from 'react';
import { 
  Building2, 
  Database, 
  Download, 
  UserCheck, 
  ArrowLeftRight,
  Menu,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useRemittance } from '../lib/store';

interface HeaderProps {
  onOpenBackup: () => void;
  onOpenSupabase: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBackup, onOpenSupabase, onToggleMobileMenu }) => {
  const { db, language, setLanguage, currentUser, switchUser, logout, t } = useRemittance();

  const pendingCount = db.transactions.filter(t => t.status === 'PENDING_APPROVAL').length;
  const currentBranch = db.branches.find(b => b.id === currentUser.branchId) || db.branches[0];

  return (
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* Left: Mobile Menu + Title + Breadcrumbs / Language */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-600 focus:outline-none"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                {language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲစနစ်' : 'Remittance Management System'}
              </h1>
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                v2.4 Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block leading-none mt-0.5">
              {language === 'my' ? 'မြန်မာနိုင်ငံတော်ဗဟိုဘဏ် စည်းမျဉ်းကိုက် ငွေလွှဲနှင့် စာရင်းရှင်းလင်းမှု' : 'CBM-Compliant Money Transfer & Cross-Border Settlement'}
            </p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
              language === 'en' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('my')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
              language === 'my' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            မြန်မာ
          </button>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Supabase Status Pill */}
        <button
          onClick={onOpenSupabase}
          className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
            db.supabaseConfig.isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title={db.supabaseConfig.isConnected ? 'Supabase Connected' : 'Configure Supabase Cloud'}
        >
          <div className={`w-2 h-2 rounded-full ${db.supabaseConfig.isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          <span>{db.supabaseConfig.isConnected ? 'Supabase Active' : 'DB Engine'}</span>
        </button>

        {/* Branch Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-[11px]">{language === 'my' ? currentBranch?.nameMm : currentBranch?.nameEn}</span>
        </div>

        {/* Role & Operator Switcher */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <div className="text-left">
            <div className="text-[9px] text-slate-500 uppercase font-mono font-bold leading-none">
              {currentUser.role}
            </div>
            <select
              value={currentUser.id}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer pr-1"
              aria-label="Switch current active user"
            >
              {db.users.map((u) => (
                <option key={u.id} value={u.id} className="bg-white text-slate-900">
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Backup Action */}
        <button
          onClick={onOpenBackup}
          className="p-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
          title={t.backup}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Logout Action */}
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          title={language === 'my' ? 'စနစ်မှ ထွက်မည် (Logout)' : 'Sign out'}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{language === 'my' ? 'ထွက်မည် (Logout)' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
};
