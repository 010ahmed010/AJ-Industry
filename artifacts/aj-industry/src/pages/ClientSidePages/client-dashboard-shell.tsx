import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClerk } from '@clerk/react';
import { useGetClientOverview, useGetClientProfile, useUpdateClientProfile, getGetClientOverviewQueryKey, getGetClientProfileQueryKey } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { Activity, AlertTriangle, ChevronLeft, Command, Gauge, LayoutDashboard, LifeBuoy, LogOut, Menu, MessageCircle, PanelLeftClose, Printer, Settings2, X } from 'lucide-react';

export type ClientLanguage = 'ar' | 'en';
export const isArabic = (language: ClientLanguage) => language === 'ar';
export function clientText(language: ClientLanguage, arabic: string, english: string) {
  return isArabic(language) ? arabic : english;
}

export type ClientProfile = {
  userId: string;
  username: string;
  email: string;
  name: string;
  company: string;
};

export type ClientRequest = {
  id: string;
  reference: string;
  kind: 'print';
  projectName: string;
  serviceSlug: string;
  status: 'submitted' | 'reviewing' | 'quoted' | 'scheduled' | 'completed';
  statusAr: string;
  statusEn: string;
  material: string;
  finish: string;
  quantity: number;
  timeline: string;
  notes: string;
  fileName?: string;
  createdAt: string | Date;
};

type ClientDashboardContextValue = {
  language: ClientLanguage;
  setLanguage: (language: ClientLanguage) => void;
  profile: ClientProfile;
  requests: ClientRequest[];
  isLoading: boolean;
  error: unknown;
  saveProfile: (profile: Pick<ClientProfile, 'name' | 'company'>) => Promise<void>;
  isSavingProfile: boolean;
  refresh: () => Promise<void>;
};

const emptyProfile: ClientProfile = { userId: '', username: '', email: '', name: '', company: '' };
const DashboardContext = createContext<ClientDashboardContextValue>({
  language: 'ar',
  setLanguage: () => undefined,
  profile: emptyProfile,
  requests: [],
  isLoading: true,
  error: undefined,
  saveProfile: async () => undefined,
  isSavingProfile: false,
  refresh: async () => undefined,
});

export function useClientDashboard() {
  return useContext(DashboardContext);
}

export function ClientDashboardProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [language, setLanguageState] = useState<ClientLanguage>(() => {
    const saved = localStorage.getItem('aj-client-language') || localStorage.getItem('aj-language');
    return saved === 'en' ? 'en' : 'ar';
  });
  const profileQuery = useGetClientProfile();
  const overviewQuery = useGetClientOverview();
  const updateProfile = useUpdateClientProfile();

  const profile = overviewQuery.data?.profile ?? profileQuery.data ?? emptyProfile;
  const requests = (overviewQuery.data?.requests ?? []) as ClientRequest[];
  const saveProfile = async (nextProfile: Pick<ClientProfile, 'name' | 'company'>) => {
    const result = await updateProfile.mutateAsync({ data: nextProfile });
    queryClient.setQueryData(getGetClientProfileQueryKey(), result);
    await queryClient.invalidateQueries({ queryKey: getGetClientOverviewQueryKey() });
  };

  useEffect(() => {
    document.documentElement.dir = isArabic(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('aj-client-language', language);
  }, [language]);

  return (
    <DashboardContext.Provider value={{
      language,
      setLanguage: setLanguageState,
      profile,
      requests,
      isLoading: profileQuery.isLoading || overviewQuery.isLoading,
      error: profileQuery.error || overviewQuery.error,
      saveProfile,
      isSavingProfile: updateProfile.isPending,
      refresh: async () => { await Promise.all([profileQuery.refetch(), overviewQuery.refetch()]); },
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

type NavItem = { href: string; labelAr: string; labelEn: string; code: string; icon: typeof LayoutDashboard };
const navItems: NavItem[] = [
  { href: '/client', labelAr: 'نظرة عامة', labelEn: 'Overview', code: '01', icon: LayoutDashboard },
  { href: '/client/printing', labelAr: 'طلبات الطباعة', labelEn: 'Print requests', code: '02', icon: Printer },
  { href: '/client/consultations', labelAr: 'الاستشارات', labelEn: 'Consultations', code: '03', icon: MessageCircle },
  { href: '/client/settings', labelAr: 'إعدادات الحساب', labelEn: 'Account settings', code: '04', icon: Settings2 },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3 overflow-hidden"><span className="relative grid size-10 shrink-0 place-items-center border border-primary/60 bg-primary/10 font-code text-sm font-bold text-primary"><span className="absolute inset-1 border border-primary/25" />AJ</span>{!compact && <span className="min-w-0 leading-none"><span className="block truncate font-display text-base font-bold tracking-tight text-foreground">AJ—INDUSTRY</span><span className="mt-1 block truncate font-code text-[8px] tracking-[.2em] text-muted-foreground">CLIENT CONTROL ROOM</span></span>}</div>;
}

function StatusLight({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-2 font-code text-[9px] tracking-[.12em] text-accent"><span className="size-1.5 animate-pulse rounded-full bg-accent" />{label}</span>;
}

export function DashboardSidebar({ currentPath, collapsed, onCollapse, mobileOpen, onMobileClose }: { currentPath: string; collapsed: boolean; onCollapse: () => void; mobileOpen: boolean; onMobileClose: () => void }) {
  const { language, profile } = useClientDashboard();
  const { signOut } = useClerk();
  const sidebarContent = <div className="flex h-full min-h-0 flex-col">
    <div className={`flex h-[78px] items-center border-b border-border/70 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}><Link href="/" onClick={onMobileClose} aria-label={clientText(language, 'العودة إلى الصفحة الرئيسية', 'Back to public home')}><BrandMark compact={collapsed} /></Link>{!collapsed && <button type="button" onClick={onCollapse} className="grid size-8 place-items-center border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary" aria-label={clientText(language, 'طي الشريط الجانبي', 'Collapse sidebar')}><PanelLeftClose className="size-4" /></button>}</div>
    <div className={`border-b border-border/70 px-4 py-5 ${collapsed ? 'text-center' : ''}`}><div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}><span className="grid size-9 shrink-0 place-items-center border border-primary/40 bg-primary/10 font-display text-sm font-bold text-primary">{profile.name.slice(0, 1) || 'A'}</span>{!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.name || profile.username}</p><p className="mt-1 truncate font-code text-[9px] text-muted-foreground">{profile.email}</p></div>}</div></div>
    <nav className="min-h-0 flex-1 px-3 py-5" aria-label={clientText(language, 'تنقل لوحة العميل', 'Client dashboard navigation')}><p className={`mb-3 px-3 font-code text-[9px] tracking-[.18em] text-muted-foreground ${collapsed ? 'text-center' : ''}`}>{collapsed ? '—' : clientText(language, 'مساحة العمل', 'WORKSPACE')}</p><div className="grid gap-1">{navItems.map((item) => { const active = currentPath === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onMobileClose} className={`group flex min-h-11 items-center gap-3 border px-3 py-2 transition-colors ${active ? 'border-primary/45 bg-primary/10 text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground'} ${collapsed ? 'justify-center' : ''}`} aria-current={active ? 'page' : undefined} title={collapsed ? clientText(language, item.labelAr, item.labelEn) : undefined}><Icon className={`size-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />{!collapsed && <span className="flex min-w-0 flex-1 items-center justify-between gap-2"><span className="truncate text-sm">{clientText(language, item.labelAr, item.labelEn)}</span><span className="font-code text-[9px] text-muted-foreground">{item.code}</span></span>}</Link>; })}</div></nav>
     <div className={`border-t border-border/70 p-4 ${collapsed ? 'grid justify-center gap-3' : 'grid gap-3'}`}><div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>{!collapsed && <StatusLight label={clientText(language, 'متصل', 'ONLINE')} />}<button type="button" onClick={onMobileClose} className="text-muted-foreground transition-colors hover:text-primary" aria-label={clientText(language, 'مركز المساعدة', 'Help center')}><LifeBuoy className="size-4" /></button></div><button type="button" onClick={() => void signOut({ redirectUrl: '/' })} className={`flex min-h-10 items-center gap-3 border border-border px-3 py-2 text-start text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive-foreground ${collapsed ? 'justify-center' : ''}`} aria-label={clientText(language, 'تسجيل الخروج', 'Sign out')} data-testid="button-sidebar-sign-out"><LogOut className="size-4 shrink-0" />{!collapsed && <span>{clientText(language, 'تسجيل الخروج', 'Sign out')}</span>}</button></div>
  </div>;
  return <><aside className={`fixed inset-y-0 start-0 z-50 hidden border-e border-border/80 bg-[#071126] transition-[width] duration-300 lg:block ${collapsed ? 'w-[76px]' : 'w-[256px]'}`}>{sidebarContent}</aside>{mobileOpen && <div className="fixed inset-0 z-[60] lg:hidden"><button type="button" onClick={onMobileClose} className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-label={clientText(language, 'إغلاق القائمة', 'Close navigation')} /><aside className="relative h-full w-[min(88vw,320px)] border-e border-border bg-[#071126] shadow-2xl"><button type="button" onClick={onMobileClose} className="absolute end-4 top-5 z-10 grid size-8 place-items-center border border-border text-muted-foreground" aria-label={clientText(language, 'إغلاق القائمة', 'Close navigation')}><X className="size-4" /></button>{sidebarContent}</aside></div>}</>;
}

export function ClientDashboardShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  const { language } = useClientDashboard();
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, []);
  return <div className="noise min-h-[100dvh] bg-background text-foreground"><DashboardSidebar currentPath={currentPath} collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} /><div className={`min-h-[100dvh] transition-[padding] duration-300 lg:ps-[256px] ${collapsed ? 'lg:ps-[76px]' : ''}`}><header className="sticky top-0 z-40 flex h-[70px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-xl lg:px-8"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center border border-border text-muted-foreground lg:hidden" aria-label={clientText(language, 'فتح القائمة', 'Open navigation')}><Menu className="size-4" /></button><div className="hidden items-center gap-2 font-code text-[9px] tracking-[.16em] text-muted-foreground sm:flex"><Command className="size-3.5 text-primary" /> CONTROL ROOM / {currentPath === '/client' ? 'OVERVIEW' : currentPath.split('/').pop()?.toUpperCase()}</div><div className="sm:hidden"><BrandMark /></div></div><div className="flex items-center gap-3"><StatusLight label={clientText(language, 'المنصة متصلة', 'PLATFORM ONLINE')} /><div className="hidden h-5 w-px bg-border sm:block" /><button type="button" onClick={() => void signOut({ redirectUrl: '/' })} className="border border-border px-3 py-2 font-code text-[9px] tracking-[.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary">{clientText(language, 'تسجيل الخروج', 'SIGN OUT')}</button></div></header><main className="relative overflow-hidden px-5 py-8 sm:px-8 lg:px-10"><div className="pointer-events-none absolute inset-0 -z-10 grid-tech opacity-[.12]" /><div className="pointer-events-none absolute end-0 top-0 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />{children}</main></div></div>;
}

export function PageIntro({ code, title, description, action }: { code: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col justify-between gap-6 border-b border-border/80 pb-7 md:flex-row md:items-end"><div><div className="mb-4 flex items-center gap-3 font-code text-[9px] tracking-[.2em] text-primary"><span className="h-px w-7 bg-primary" />{code}</div><h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p></div>{action}</div>;
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`border border-border/80 bg-card/75 ${className}`}>{children}</section>; }
export function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6"><div><p className="font-code text-[9px] tracking-[.18em] text-primary">{eyebrow}</p><h2 className="mt-2 font-display text-lg font-bold">{title}</h2></div>{action}</div>; }
export function Tag({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'muted' }) { const toneClass = tone === 'green' ? 'border-accent/35 bg-accent/10 text-accent' : tone === 'amber' ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : tone === 'muted' ? 'border-border bg-secondary text-muted-foreground' : 'border-primary/35 bg-primary/10 text-primary'; return <span className={`inline-flex items-center border px-2 py-1 font-code text-[9px] tracking-[.08em] ${toneClass}`}>{children}</span>; }
export function ClientDataError({ language, onRetry }: { language: ClientLanguage; onRetry: () => void }) {
  return <div role="alert" className="mt-7 border border-destructive/40 bg-destructive/10 p-6"><div className="flex items-start gap-4"><AlertTriangle className="mt-1 size-5 shrink-0 text-destructive-foreground" /><div className="min-w-0 flex-1"><p className="font-display text-lg font-bold">{clientText(language, 'تعذر الوصول إلى بيانات مساحة العمل', 'Workspace data is temporarily unavailable')}</p><p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{clientText(language, 'تسجيل الدخول يعمل، لكن لم نتمكن من الوصول إلى البيانات المحفوظة لهذا الحساب. لن نعرض أرقاماً أو طلبات وهمية.', 'Your sign-in is working, but the saved data for this account could not be reached. We will not show fabricated metrics or requests.')}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex items-center border border-destructive/40 px-4 py-2 font-code text-[9px] tracking-[.12em] text-destructive-foreground transition-colors hover:border-destructive">{clientText(language, 'إعادة المحاولة', 'RETRY DATA CONNECTION')}</button></div></div></div>;
}
export function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Gauge }) { return <Panel className="relative overflow-hidden p-5"><div className="absolute end-0 top-0 h-20 w-20 bg-primary/5 [clip-path:polygon(100%_0,100%_100%,0_0)]" /><div className="flex items-start justify-between"><span className="font-code text-[9px] tracking-[.14em] text-muted-foreground">{label}</span><Icon className="size-4 text-primary" /></div><p className="mt-5 font-code text-2xl text-foreground">{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></Panel>; }
export function ProgressBar({ value }: { value: number }) { return <div className="h-1.5 bg-background"><div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${value}%` }} /></div>; }
export function QuickLink({ href, code, title, description, icon: Icon }: { href: string; code: string; title: string; description: string; icon: typeof Gauge }) { return <Link href={href} className="group flex items-center gap-4 border border-border/80 bg-card/60 p-4 transition-colors hover:border-primary/60 hover:bg-primary/5"><span className="grid size-10 shrink-0 place-items-center border border-primary/25 bg-primary/5 text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block font-code text-[9px] text-primary">{code}</span><span className="mt-1 block text-sm font-semibold">{title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{description}</span></span><ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary rtl:rotate-180" /></Link>; }

export { Activity, ChevronLeft, Gauge, LayoutDashboard, Printer, Settings2 };