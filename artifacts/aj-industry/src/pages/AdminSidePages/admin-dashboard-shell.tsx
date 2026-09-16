import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { customFetch } from '@workspace/api-client-react';
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Command,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Inbox,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth, useClerk } from '@/lib/auth';

export type Language = 'ar' | 'en';

export function adminText(language: Language, ar: string, en: string) {
  return language === 'ar' ? ar : en;
}

export interface AdminPrintRequest {
  id: string;
  reference: string;
  userId: string;
  projectName: string;
  serviceSlug: string;
  status: 'submitted' | 'reviewing' | 'quoted' | 'scheduled' | 'completed';
  statusAr: string;
  statusEn: string;
  material: string;
  finish: string;
  quantity: number;
  timeline: string;
  notes?: string;
  fileName?: string;
  quoteAmount?: number;
  quoteCurrency?: string;
  estimatedDelivery?: string;
  adminFeedback?: string;
  adminUpdatedAt?: string;
  createdAt: string;
  client: {
    name: string;
    email: string;
    company?: string;
  };
}

export interface AdminConsultation {
  id: string;
  reference: string;
  userId: string;
  kind: 'consultation' | 'specialist';
  title: string;
  details: string;
  specialty?: string;
  providerType?: 'person' | 'company' | 'guide';
  preferredProvider?: string;
  status: 'submitted' | 'reviewing' | 'contacted' | 'completed';
  statusAr: string;
  statusEn: string;
  adminResponse?: string;
  meetingScheduledAt?: string;
  assignedSpecialist?: string;
  adminUpdatedAt?: string;
  createdAt: string;
  client: {
    name: string;
    email: string;
    company?: string;
  };
}

export interface AdminInquiry {
  _id: string;
  reference: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  serviceSlug?: string;
  message: string;
  status: 'new' | 'reviewing' | 'contacted' | 'archived';
  adminNotes?: string;
  createdAt: string;
}

export interface AdminClientProfile {
  userId: string;
  name: string;
  email: string;
  company?: string;
  createdAt: string;
  updatedAt?: string;
  stats: {
    totalPrintRequests: number;
    activePrintRequests: number;
    totalConsultations: number;
  };
}

export interface AdminOverviewData {
  metrics: {
    totalRequests: number;
    activePrintJobs: number;
    pendingConsultations: number;
    newInquiries: number;
    totalClients: number;
    totalQuotedValue: number;
  };
  printBreakdown: {
    total: number;
    submitted: number;
    reviewing: number;
    quoted: number;
    scheduled: number;
    completed: number;
  };
  consultationsBreakdown: {
    total: number;
    submitted: number;
    reviewing: number;
    contacted: number;
    completed: number;
  };
  inquiriesBreakdown: {
    total: number;
    new: number;
    contacted: number;
  };
  activities: Array<{
    id: string;
    kind: 'print' | 'consultation' | 'inquiry';
    reference: string;
    title: string;
    subtitle: string;
    status: string;
    statusAr: string;
    statusEn: string;
    createdAt: string;
  }>;
}

export function StatusBadge({
  status,
  statusAr,
  statusEn,
  language,
}: {
  status: string;
  statusAr?: string;
  statusEn?: string;
  language: Language;
}) {
  const toneMap: Record<string, string> = {
    submitted: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    new: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    reviewing: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    quoted: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    scheduled: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    contacted: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    archived: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400',
  };

  const defaultTextMap: Record<string, [string, string]> = {
    submitted: ['تم الاستلام', 'Submitted'],
    new: ['جديد', 'New'],
    reviewing: ['قيد المراجعة', 'Reviewing'],
    quoted: ['تم التسعير', 'Quoted'],
    scheduled: ['مجدول', 'Scheduled'],
    contacted: ['تم التواصل', 'Contacted'],
    completed: ['مكتمل', 'Completed'],
    archived: ['مؤرشف', 'Archived'],
  };

  const text =
    language === 'ar'
      ? statusAr || defaultTextMap[status]?.[0] || status
      : statusEn || defaultTextMap[status]?.[1] || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-code text-[10px] font-semibold uppercase tracking-wider ${
        toneMap[status] || 'border-border bg-secondary/60 text-muted-foreground'
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}

export interface AdminNavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  code: string;
  icon: typeof Activity;
}

export const adminNavItems: AdminNavItem[] = [
  {
    href: '/admin-aj-industry',
    labelAr: 'نظرة عامة',
    labelEn: 'Overview',
    code: '01',
    icon: Activity,
  },
  {
    href: '/admin-aj-industry/printing',
    labelAr: 'طلبات الطباعة 3D',
    labelEn: '3D Print Orders',
    code: '02',
    icon: Printer,
  },
  {
    href: '/admin-aj-industry/consultations',
    labelAr: 'الاستشارات الهندسية',
    labelEn: 'Consultations',
    code: '03',
    icon: MessageSquare,
  },
  {
    href: '/admin-aj-industry/inquiries',
    labelAr: 'رسائل الموقع',
    labelEn: 'Inquiries',
    code: '04',
    icon: Inbox,
  },
  {
    href: '/admin-aj-industry/clients',
    labelAr: 'دليل العملاء',
    labelEn: 'Clients',
    code: '05',
    icon: Users,
  },
  {
    href: '/admin-aj-industry/settings',
    labelAr: 'إعدادات الإدارة والأمان',
    labelEn: 'Settings & Security',
    code: '06',
    icon: Settings,
  },
];

export function AdminBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <span className="relative grid size-10 shrink-0 place-items-center border border-primary/60 bg-primary/10 font-code text-sm font-bold text-primary">
        <span className="absolute inset-1 border border-primary/25" />
        AJ
      </span>
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className="block truncate font-display text-base font-bold tracking-tight text-foreground">
            AJ—INDUSTRY
          </span>
          <span className="mt-1 flex items-center gap-1.5 truncate font-code text-[8px] tracking-[.18em] text-emerald-400">
            <ShieldCheck className="size-2.5" />
            ADMIN CONTROL ROOM
          </span>
        </span>
      )}
    </div>
  );
}

export function AdminSidebar({
  currentPath,
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
  language,
  onToggleLanguage,
}: {
  currentPath: string;
  collapsed: boolean;
  onCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  language: Language;
  onToggleLanguage: () => void;
}) {
  const { signOut } = useClerk();
  const { user } = useAuth();

  const isItemActive = (href: string) => {
    if (href === '/admin-aj-industry') {
      return (
        currentPath === '/admin-aj-industry' ||
        currentPath === '/admin-aj-industry/' ||
        currentPath === '/admin' ||
        currentPath === '/admin/'
      );
    }
    const section = href.replace('/admin-aj-industry/', '');
    return currentPath.includes(section);
  };

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand Header */}
      <div
        className={`flex border-b border-border/70 ${
          collapsed
            ? 'h-[92px] flex-col items-center justify-center gap-2 px-2 py-2'
            : 'h-[78px] items-center justify-between px-4'
        }`}
      >
        <Link
          href="/admin-aj-industry"
          onClick={onMobileClose}
          aria-label={adminText(language, 'العودة لنظرة عامة الإدارة', 'Back to Admin Overview')}
        >
          <AdminBrandMark compact={collapsed} />
        </Link>
        <button
          type="button"
          onClick={onCollapse}
          className="grid size-8 shrink-0 place-items-center border border-border bg-secondary/30 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          aria-label={
            collapsed
              ? adminText(language, 'توسيع الشريط الجانبي (عرض الأسماء والأيقونات)', 'Expand sidebar (show icons & names)')
              : adminText(language, 'طي الشريط الجانبي (أيقونات فقط)', 'Collapse sidebar (icons only)')
          }
          title={
            collapsed
              ? adminText(language, 'توسيع الشريط الجانبي (عرض الأسماء والأيقونات)', 'Expand sidebar (show icons & names)')
              : adminText(language, 'طي الشريط الجانبي (أيقونات فقط)', 'Collapse sidebar (icons only)')
          }
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 rtl:rotate-180" />
          ) : (
            <PanelLeftClose className="size-4 rtl:rotate-180" />
          )}
        </button>
      </div>

      {/* Admin User Profile */}
      <div
        className={`border-b border-border/70 px-4 py-5 ${
          collapsed ? 'text-center' : ''
        }`}
      >
        <div
          className={`flex items-center gap-3 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="grid size-9 shrink-0 place-items-center border border-emerald-500/40 bg-emerald-500/10 font-display text-xs font-bold text-emerald-400">
            AD
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {adminText(language, 'المدير', 'Director')}
                </p>
                <span className="inline-flex items-center border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-code text-[8px] font-bold text-emerald-400">
                  ROOT
                </span>
              </div>
              <p className="mt-0.5 truncate font-code text-[9px] text-muted-foreground">
                {user?.email || 'admin@aj-industry.com'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav
        className="min-h-0 flex-1 px-3 py-5"
        aria-label={adminText(language, 'تنقل لوحة الإدارة', 'Admin navigation')}
      >
        <p
          className={`mb-3 px-3 font-code text-[9px] tracking-[.18em] text-muted-foreground ${
            collapsed ? 'text-center' : ''
          }`}
        >
          {collapsed ? '—' : adminText(language, 'إدارة العمليات', 'OPERATIONS')}
        </p>
        <div className="grid gap-1">
          {adminNavItems.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`group flex min-h-11 items-center gap-3 border px-3 py-2 transition-colors ${
                  active
                    ? 'border-primary/45 bg-primary/10 text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? adminText(language, item.labelAr, item.labelEn) : undefined}
              >
                <Icon
                  className={`size-4 shrink-0 ${
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-primary'
                  }`}
                />
                {!collapsed && (
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {adminText(language, item.labelAr, item.labelEn)}
                    </span>
                    <span className="font-code text-[9px] text-muted-foreground">
                      {item.code}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Controls */}
      <div
        className={`border-t border-border/70 p-4 ${
          collapsed ? 'grid justify-center gap-3' : 'grid gap-3'
        }`}
      >
        {/* DB Status */}
        <div
          className={`flex items-center gap-2 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && (
            <span className="inline-flex items-center gap-2 font-code text-[9px] tracking-[.12em] text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              MONGODB SYNCED
            </span>
          )}
          <Link
            href="/"
            target="_blank"
            className="text-muted-foreground transition-colors hover:text-primary"
            title={adminText(language, 'زيارة الموقع العام', 'Open Public Site')}
          >
            <ExternalLink className="size-4" />
          </Link>
        </div>

        {/* Language switch button */}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex min-h-9 items-center justify-between border border-border bg-secondary/30 px-3 py-1.5 font-code text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <span className="flex items-center gap-2">
              <Globe className="size-3.5" />
              <span>{adminText(language, 'لغة اللوحة', 'Language')}</span>
            </span>
            <span className="font-bold text-foreground">
              {language === 'ar' ? 'العربية' : 'English'}
            </span>
          </button>
        )}

        {/* Sign out */}
        <button
          type="button"
          onClick={() => void signOut({ redirectUrl: '/' })}
          className={`flex min-h-10 items-center gap-3 border border-border px-3 py-2 text-start text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive-foreground ${
            collapsed ? 'justify-center' : ''
          }`}
          aria-label={adminText(language, 'تسجيل الخروج', 'Sign out')}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && (
            <span>{adminText(language, 'تسجيل الخروج', 'Sign out')}</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`fixed inset-y-0 start-0 z-50 hidden border-e border-border/80 bg-[#071126] transition-[width] duration-300 lg:block ${
          collapsed ? 'w-[76px]' : 'w-[256px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            onClick={onMobileClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label={adminText(language, 'إغلاق القائمة', 'Close navigation')}
          />
          <aside className="relative h-full w-[min(88vw,320px)] border-e border-border bg-[#071126] shadow-2xl">
            <button
              type="button"
              onClick={onMobileClose}
              className="absolute end-4 top-5 z-10 grid size-8 place-items-center border border-border text-muted-foreground"
              aria-label={adminText(language, 'إغلاق القائمة', 'Close navigation')}
            >
              <X className="size-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export function AdminDashboardShell({
  children,
  currentPath,
  language,
  onToggleLanguage,
}: {
  children: ReactNode;
  currentPath: string;
  language: Language;
  onToggleLanguage: () => void;
}) {
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const getSectionTitle = () => {
    if (currentPath.includes('printing')) return adminText(language, 'طلبات الطباعة 3D', '3D PRINT ORDERS');
    if (currentPath.includes('consultations')) return adminText(language, 'الاستشارات الهندسية', 'CONSULTATIONS');
    if (currentPath.includes('inquiries')) return adminText(language, 'رسائل الموقع', 'INQUIRIES');
    if (currentPath.includes('clients')) return adminText(language, 'دليل العملاء', 'CLIENT DIRECTORY');
    return adminText(language, 'نظرة عامة', 'OVERVIEW');
  };

  return (
    <div className="noise min-h-[100dvh] bg-[#071126] text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <AdminSidebar
        currentPath={currentPath}
        collapsed={collapsed}
        onCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />
      <div
        className={`min-h-[100dvh] transition-[padding] duration-300 lg:ps-[256px] ${
          collapsed ? 'lg:ps-[76px]' : ''
        }`}
      >
        <header className="sticky top-0 z-40 flex h-[70px] items-center justify-between border-b border-border/80 bg-[#071126]/90 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center border border-border text-muted-foreground lg:hidden"
              aria-label={adminText(language, 'فتح القائمة', 'Open navigation')}
            >
              <Menu className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden size-9 place-items-center border border-border bg-secondary/30 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary lg:grid"
              aria-label={
                collapsed
                  ? adminText(language, 'توسيع الشريط الجانبي', 'Expand sidebar')
                  : adminText(language, 'طي الشريط الجانبي', 'Collapse sidebar')
              }
              title={
                collapsed
                  ? adminText(language, 'توسيع الشريط الجانبي', 'Expand sidebar')
                  : adminText(language, 'طي الشريط الجانبي', 'Collapse sidebar')
              }
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4 rtl:rotate-180" />
              ) : (
                <PanelLeftClose className="size-4 rtl:rotate-180" />
              )}
            </button>
            <div className="hidden items-center gap-2 font-code text-[9px] tracking-[.16em] text-muted-foreground sm:flex">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>AJ ADMIN / {getSectionTitle().toUpperCase()}</span>
            </div>
            <div className="sm:hidden">
              <AdminBrandMark compact={false} />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sync status */}
            <div className="hidden items-center gap-2 border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-xs text-emerald-400 sm:flex">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-code text-[10px]">MONGODB LIVE</span>
            </div>

            {/* Language toggle - Hidden on mobile screen since it is inside mobile sidebar */}
            <button
              type="button"
              onClick={onToggleLanguage}
              className="hidden h-8 items-center gap-1.5 border border-border bg-secondary/50 px-2.5 font-code text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary sm:flex"
            >
              <Globe className="size-3.5" />
              <span>{language === 'ar' ? 'EN' : 'AR'}</span>
            </button>

            {/* Sign out - Hidden on mobile screen since it is inside mobile sidebar */}
            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: '/' })}
              className="hidden h-8 items-center border border-border px-3 font-code text-[9px] tracking-[.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex"
            >
              {adminText(language, 'تسجيل الخروج', 'SIGN OUT')}
            </button>
          </div>
        </header>

        <main className="relative overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 -z-10 grid-tech opacity-[.12]" />
          <div className="pointer-events-none absolute end-0 top-0 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AdminHeader({
  language,
  onToggleLanguage,
}: {
  language: Language;
  onToggleLanguage: () => void;
}) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[#071126]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/admin-aj-industry" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center border border-primary/60 bg-primary/10 font-code text-sm font-bold text-primary">
              AJ
            </span>
            <div>
              <span className="block font-display text-sm font-bold tracking-tight text-foreground">
                AJ—INDUSTRY
              </span>
              <span className="flex items-center gap-1.5 font-code text-[9px] tracking-[.18em] text-primary">
                <ShieldCheck className="size-3 text-emerald-400" />
                ADMIN PORTAL
              </span>
            </div>
          </Link>
          <div className="hidden items-center gap-2 border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-xs text-emerald-400 sm:flex">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="font-code text-[10px]">MONGODB SYNCED</span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {adminNavItems.map((item) => {
            const isActive =
              item.href === '/admin-aj-industry'
                ? location === '/admin-aj-industry' || location === '/admin'
                : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 font-code text-xs transition-colors ${
                  isActive
                    ? 'border-b-2 border-primary bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Icon className="size-3.5" />
                {adminText(language, item.labelAr, item.labelEn)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex h-8 items-center gap-1.5 border border-border bg-secondary/50 px-2.5 font-code text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Globe className="size-3.5" />
            <span>{language === 'ar' ? 'EN' : 'AR'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}) {
  return (
    <div className="border border-border bg-[#0b1528] p-5">
      <div className="flex items-center justify-between">
        <p className="font-code text-[10px] tracking-[.18em] text-muted-foreground">
          {label}
        </p>
        <span className="grid size-8 place-items-center border border-border/60 bg-secondary/40 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {note && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {trend && <span className="font-semibold text-emerald-400">{trend}</span>}
          {note}
        </p>
      )}
    </div>
  );
}
