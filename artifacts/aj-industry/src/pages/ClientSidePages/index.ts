import { createElement } from 'react';
import { useLocation } from 'wouter';
import ClientOverviewPage from './client-overview-page';
import { ClientDashboardProvider, ClientDashboardShell } from './client-dashboard-shell';
import ClientPrintingPage from './client-printing-page';
import ClientConsultationsPage from './client-consultations-page';
import ClientSettingsPage from './client-settings-page';

function ClientDashboardRouter({ path }: { path: string }) {
  if (path === '/client/printing') return createElement(ClientPrintingPage);
  if (path === '/client/consultations') return createElement(ClientConsultationsPage);
  if (path === '/client/settings') return createElement(ClientSettingsPage);
  return createElement(ClientOverviewPage);
}

export function ClientDashboardPage() {
  const [location] = useLocation();
  const path = location.startsWith('/client') ? location : '/client';

  return createElement(
    ClientDashboardProvider,
    null,
    createElement(ClientDashboardShell, { currentPath: path, children: createElement(ClientDashboardRouter, { path }) }),
  );
}

export default ClientDashboardPage;
