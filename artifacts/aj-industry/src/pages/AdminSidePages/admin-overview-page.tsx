import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { customFetch } from '@workspace/api-client-react';
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  MessageSquare,
  Printer,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  adminText,
  MetricCard,
  StatusBadge,
  type AdminOverviewData,
  type Language,
} from './admin-dashboard-shell';

export function AdminOverviewPage({ language }: { language: Language }) {
  const queryClient = useQueryClient();
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'print' | 'consultation' | 'inquiry'>('all');

  const { data, isLoading, isFetching, error, refetch } = useQuery<AdminOverviewData>({
    queryKey: ['admin-overview'],
    queryFn: () => customFetch<AdminOverviewData>('/api/admin/overview'),
    refetchInterval: 10_000,
  });

  const metrics = data?.metrics ?? {
    totalRequests: 0,
    activePrintJobs: 0,
    pendingConsultations: 0,
    newInquiries: 0,
    totalClients: 0,
    totalQuotedValue: 0,
  };

  const printBreakdown = data?.printBreakdown ?? {
    total: 0,
    submitted: 0,
    reviewing: 0,
    quoted: 0,
    scheduled: 0,
    completed: 0,
  };

  const activities = data?.activities || [];
  const filteredActivities = activities.filter((item) => {
    if (activityFilter !== 'all' && item.kind !== activityFilter) return false;
    if (!activitySearch.trim()) return true;
    const q = activitySearch.toLowerCase().trim();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.reference?.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q) ||
      item.statusAr?.toLowerCase().includes(q) ||
      item.statusEn?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-code text-[10px] tracking-[.2em] text-primary">
              ADMIN / 01 — SYSTEM OVERVIEW
            </span>
            {isFetching && (
              <span className="flex items-center gap-1 font-code text-[9px] text-primary animate-pulse">
                <RefreshCw className="size-2.5 animate-spin" />
                SYNCING
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {adminText(language, 'مركز إدارة العمليات الهندسية', 'Engineering Operations Center')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminText(
              language,
              'متابعة فورية لطلبات العملاء، تسعير مشاريع الطباعة 3D، وتحديث مسارات التنفيذ عبر MongoDB و Clerk.',
              'Real-time control over client requests, 3D print quotations, and consultation workflows backed by MongoDB & Clerk.',
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex h-9 items-center gap-2 border border-border bg-secondary/40 px-3.5 font-code text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{adminText(language, 'تحديث البيانات', 'Refresh')}</span>
          </button>
          <Link
            href="/admin-aj-industry/printing"
            className="flex h-9 items-center gap-2 bg-primary px-4 font-code text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Printer className="size-3.5" />
            <span>{adminText(language, 'إدارة الطلبات', 'Manage Orders')}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="ACTIVE 3D PRINT JOBS"
          value={isLoading ? '—' : String(metrics.activePrintJobs).padStart(2, '0')}
          note={adminText(
            language,
            `${printBreakdown.submitted} جديد · ${printBreakdown.reviewing} قيد المراجعة`,
            `${printBreakdown.submitted} new · ${printBreakdown.reviewing} in review`,
          )}
          icon={Printer}
        />
        <MetricCard
          label="CONSULTATIONS PENDING"
          value={isLoading ? '—' : String(metrics.pendingConsultations).padStart(2, '0')}
          note={adminText(
            language,
            'استشارات هندسية بانتظار الرد',
            'Pending engineering consultations',
          )}
          icon={MessageSquare}
        />
        <MetricCard
          label="NEW PUBLIC INQUIRIES"
          value={isLoading ? '—' : String(metrics.newInquiries).padStart(2, '0')}
          note={adminText(language, 'رسائل واردة من الموقع', 'Direct contact messages')}
          icon={Inbox}
        />
        <MetricCard
          label="REGISTERED CLIENTS"
          value={isLoading ? '—' : String(metrics.totalClients).padStart(2, '0')}
          note={adminText(language, 'عملاء مسجلون في قاعدة البيانات', 'Profiles in MongoDB')}
          icon={Users}
        />
      </div>

      {/* Print Pipeline Progress Stages */}
      <div className="border border-border bg-[#0b1528] p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-2 border-b border-border/70 pb-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-code text-[10px] tracking-[.18em] text-primary">
              3D PRINTING PIPELINE / WORKFLOW
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-foreground">
              {adminText(language, 'مراحل تنفيذ طلبات الطباعة', 'Print Request Status Distribution')}
            </h2>
          </div>
          <Link
            href="/admin-aj-industry/printing"
            className="flex items-center gap-1 font-code text-xs text-primary hover:underline"
          >
            {adminText(language, 'فتح جدول الطلبات بالكامل', 'View all orders')}
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            {
              key: 'submitted',
              labelAr: 'تم الاستلام',
              labelEn: 'Received',
              count: printBreakdown.submitted,
              color: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
            },
            {
              key: 'reviewing',
              labelAr: 'مراجعة هندسية',
              labelEn: 'In Review',
              count: printBreakdown.reviewing,
              color: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
            },
            {
              key: 'quoted',
              labelAr: 'تم التسعير',
              labelEn: 'Quoted',
              count: printBreakdown.quoted,
              color: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
            },
            {
              key: 'scheduled',
              labelAr: 'مجدول للإنتاج',
              labelEn: 'Scheduled',
              count: printBreakdown.scheduled,
              color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
            },
            {
              key: 'completed',
              labelAr: 'مكتمل وجاهز',
              labelEn: 'Completed',
              count: printBreakdown.completed,
              color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
            },
          ].map((stage) => (
            <div
              key={stage.key}
              className={`border p-4 transition-colors ${stage.color}`}
            >
              <p className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">
                {adminText(language, stage.labelAr, stage.labelEn)}
              </p>
              <p className="mt-2 font-display text-2xl font-bold">
                {String(stage.count).padStart(2, '0')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Grid: Recent Activity & Quick Operational Actions */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Activity Stream */}
        <div className="border border-border bg-[#0b1528]">
          <div className="border-b border-border/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-code text-[10px] tracking-[.18em] text-primary">
                  FEED / REAL-TIME ACTIVITY
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-foreground">
                  {adminText(language, 'آخر الأحداث والطلبات الواردة', 'Recent Incoming Activity')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-code text-xs text-muted-foreground">
                  {filteredActivities.length} / {activities.length}{' '}
                  {adminText(language, 'نشاط', 'records')}
                </span>
              </div>
            </div>

            {/* Search and Category Filter Controls */}
            <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder={adminText(
                    language,
                    'البحث بالمرجع، العنوان، أو الحالة...',
                    'Search reference, title, status...',
                  )}
                  className="h-8.5 w-full rounded border border-border/80 bg-[#101f37] pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                {activitySearch && (
                  <button
                    type="button"
                    onClick={() => setActivitySearch('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="مسح"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 font-code text-[11px]">
                {(['all', 'print', 'consultation', 'inquiry'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setActivityFilter(kind)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      activityFilter === kind
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {kind === 'all'
                      ? adminText(language, 'الكل', 'All')
                      : kind === 'print'
                      ? adminText(language, 'الطباعة', 'Print')
                      : kind === 'consultation'
                      ? adminText(language, 'الاستشارات', 'Consult')
                      : adminText(language, 'الرسائل', 'Inquiries')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/60 max-h-[480px] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {adminText(language, 'جارٍ تحميل الأنشطة…', 'Loading activity stream…')}
              </div>
            ) : !data?.activities || data.activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {adminText(language, 'لا توجد طلبات واردة بعد.', 'No incoming activities yet.')}
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Search className="mx-auto size-6 text-muted-foreground/40 mb-2" />
                <p>{adminText(language, 'لا توجد أنشطة تطابق بحثك.', 'No activity matches your search.')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActivitySearch('');
                    setActivityFilter('all');
                  }}
                  className="mt-2 text-xs text-primary underline hover:text-primary/80"
                >
                  {adminText(language, 'إعادة ضبط التصفية', 'Reset filter')}
                </button>
              </div>
            ) : (
              filteredActivities.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-secondary/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center border border-border/70 bg-secondary/50 text-primary">
                      {item.kind === 'print' ? (
                        <Printer className="size-4" />
                      ) : item.kind === 'consultation' ? (
                        <MessageSquare className="size-4" />
                      ) : (
                        <Inbox className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-code text-[9px] text-primary">{item.reference}</span>
                        <StatusBadge
                          status={item.status}
                          statusAr={item.statusAr}
                          statusEn={item.statusEn}
                          language={language}
                        />
                      </div>
                      <p className="mt-1 truncate font-semibold text-foreground text-sm">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </div>

                  <Link
                    href={
                      item.kind === 'print'
                        ? '/admin-aj-industry/printing'
                        : item.kind === 'consultation'
                        ? '/admin-aj-industry/consultations'
                        : '/admin-aj-industry/inquiries'
                    }
                    className="flex shrink-0 items-center gap-1 font-code text-xs text-primary hover:underline"
                  >
                    {adminText(language, 'فحص', 'Inspect')}
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations & System Health */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <div className="border border-border bg-[#0b1528] p-5">
            <p className="font-code text-[10px] tracking-[.18em] text-primary">
              ACTIONS / QUICK ACCESS
            </p>
            <h3 className="mt-1 font-display text-base font-bold text-foreground">
              {adminText(language, 'الإجراءات السريعة', 'Operations Shortcuts')}
            </h3>

            <div className="mt-4 grid gap-2.5">
              <Link
                href="/admin-aj-industry/printing"
                className="group flex items-center justify-between border border-border/70 bg-secondary/30 p-3 transition-colors hover:border-primary/50 hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3">
                  <Printer className="size-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-primary">
                      {adminText(language, 'تسعير طلبات الطباعة', 'Quote 3D Print Orders')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {adminText(language, 'تحديد الأسعار ومواعيد التسليم للعميل', 'Set price, delivery date & notes')}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>

              <Link
                href="/admin-aj-industry/consultations"
                className="group flex items-center justify-between border border-border/70 bg-secondary/30 p-3 transition-colors hover:border-primary/50 hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="size-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-primary">
                      {adminText(language, 'الرد على الاستشارات', 'Answer Consultations')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {adminText(language, 'تعيين المهندس المشرف وجدولة اللقاء', 'Assign lead engineer & schedule')}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>

              <Link
                href="/admin-aj-industry/clients"
                className="group flex items-center justify-between border border-border/70 bg-secondary/30 p-3 transition-colors hover:border-primary/50 hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-primary">
                      {adminText(language, 'دليل عملاء AJ', 'Client Directory')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {adminText(language, 'الشركات والحسابات الموثقة', 'Registered accounts & companies')}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>
            </div>
          </div>

          {/* Infrastructure Health Status */}
          <div className="border border-border bg-[#0b1528] p-5">
            <p className="font-code text-[10px] tracking-[.18em] text-primary">
              SYSTEM / STACK STATUS
            </p>
            <h3 className="mt-1 font-display text-base font-bold text-foreground">
              {adminText(language, 'حالة البنية التحتية', 'Infrastructure Health')}
            </h3>

            <div className="mt-4 space-y-3 font-code text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">DATABASE</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-3.5" />
                  MongoDB Atlas
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">AUTH PROVIDER</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-3.5" />
                  Clerk Dev Suite
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">API BACKEND</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-3.5" />
                  Node / Express
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">DATA CHANNEL</span>
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  Two-Way Client/Admin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
