/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RemittanceProvider, useRemittance } from './lib/store';
import { LoginView } from './components/Auth/LoginView';
import { Header } from './components/Header';
import { Sidebar, NavigationTab, SetupSubTab } from './components/Sidebar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { OutwardEntryView } from './components/Outward/OutwardEntryView';
import { OutwardApproveView } from './components/Outward/OutwardApproveView';
import { InwardEntryView } from './components/Inward/InwardEntryView';
import { InwardApproveView } from './components/Inward/InwardApproveView';
import { OutwardReportView } from './components/Reports/OutwardReportView';
import { InwardReportView } from './components/Reports/InwardReportView';
import { AdminSetupManager } from './components/Admin/AdminSetupManager';
import { BackupRestoreView } from './components/Backup/BackupRestoreView';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [setupSubTab, setSetupSubTab] = useState<SetupSubTab>('branch');
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('ALL');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (tab: NavigationTab, subTab?: SetupSubTab) => {
    setActiveTab(tab);
    if (subTab) {
      setSetupSubTab(subTab);
    }
  };

  const handleNavigateAudit = (module: string = 'ALL') => {
    setAuditModuleFilter(module);
    setActiveTab('audit_log');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header 
        onOpenBackup={() => handleNavigate('backup_restore')}
        onOpenTurso={() => handleNavigate('turso_sync')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigateCompanySetting={() => handleNavigate('admin_setup', 'operator_profile')}
      />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeSetupSubTab={setupSubTab}
          setActiveSetupSubTab={setSetupSubTab}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 min-w-0">
          <div className="max-w-7xl mx-auto space-y-4">
            {activeTab === 'dashboard' && (
              <DashboardView onNavigate={handleNavigate} />
            )}
            {activeTab === 'outward_entry' && (
              <OutwardEntryView />
            )}
            {activeTab === 'outward_approve' && (
              <OutwardApproveView />
            )}
            {activeTab === 'inward_entry' && (
              <InwardEntryView />
            )}
            {activeTab === 'inward_approve' && (
              <InwardApproveView />
            )}
            {activeTab === 'outward_report' && (
              <OutwardReportView />
            )}
            {activeTab === 'inward_report' && (
              <InwardReportView />
            )}
            {activeTab === 'admin_setup' && (
              <AdminSetupManager
                currentSubTab={setupSubTab}
                onSelectSubTab={setSetupSubTab}
                onNavigateAudit={handleNavigateAudit}
              />
            )}
            {activeTab === 'audit_log' && (
              <BackupRestoreView 
                initialTab="audit" 
                initialModuleFilter={auditModuleFilter} 
              />
            )}
            {activeTab === 'backup_restore' && (
              <BackupRestoreView initialTab="backup" />
            )}
            {activeTab === 'turso_sync' && (
              <BackupRestoreView initialTab="turso" />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UI Render Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('REMITTANCE_APP_DB_V1');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">စနစ်အချက်အလက် ဖွင့်ရာတွင် အခက်အခဲရှိနေပါသည်</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Local browser cache ကြောင့် UI ခေတ္တမပေါ်ပါက အောက်ပါခလုတ်ကိုနှိပ်၍ ပြန်လည်စတင်နိုင်ပါသည်။
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              ပြန်လည် Refresh လုပ်မည်
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Cache ရှင်းပြီး Reset ပြုလုပ်မည်
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const RootApp: React.FC = () => {
  const { isAuthenticated } = useRemittance();

  // If user is explicitly not authenticated, display the Login View
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <RemittanceProvider>
        <RootApp />
      </RemittanceProvider>
    </ErrorBoundary>
  );
}
