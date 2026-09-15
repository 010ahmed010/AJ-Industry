import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AdminDashboardShell, type Language } from './admin-dashboard-shell';
import { AdminOverviewPage } from './admin-overview-page';
import { AdminPrintingPage } from './admin-printing-page';
import { AdminConsultationsPage } from './admin-consultations-page';
import { AdminInquiriesPage } from './admin-inquiries-page';
import { AdminClientsPage } from './admin-clients-page';
import { AdminSettingsPage } from './admin-settings-page';

export function AdminDashboardPage() {
  const [location] = useLocation();
  const [language, setLanguage] = useState<Language>('ar');

  useEffect(() => {
    const saved = localStorage.getItem('aj-language') as Language | null;
    if (saved === 'en' || saved === 'ar') setLanguage(saved);
  }, []);

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    setLanguage(next);
    localStorage.setItem('aj-language', next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  const renderSection = () => {
    if (location.includes('/settings')) {
      return <AdminSettingsPage language={language} />;
    }
    if (location.includes('/printing')) {
      return <AdminPrintingPage language={language} />;
    }
    if (location.includes('/consultations')) {
      return <AdminConsultationsPage language={language} />;
    }
    if (location.includes('/inquiries')) {
      return <AdminInquiriesPage language={language} />;
    }
    if (location.includes('/clients')) {
      return <AdminClientsPage language={language} />;
    }
    return <AdminOverviewPage language={language} />;
  };

  return (
    <AdminDashboardShell
      currentPath={location}
      language={language}
      onToggleLanguage={toggleLanguage}
    >
      {renderSection()}
    </AdminDashboardShell>
  );
}

export * from './admin-dashboard-shell';
export * from './admin-overview-page';
export * from './admin-printing-page';
export * from './admin-consultations-page';
export * from './admin-inquiries-page';
export * from './admin-clients-page';
export * from './admin-settings-page';
export * from './admin-login-page';
