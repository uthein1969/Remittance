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

const RootApp: React.FC = () => {
  const { isAuthenticated } = useRemittance();

  // If user is not authenticated with a Supabase user account, display the Login View
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <RemittanceProvider>
      <RootApp />
    </RemittanceProvider>
  );
}
