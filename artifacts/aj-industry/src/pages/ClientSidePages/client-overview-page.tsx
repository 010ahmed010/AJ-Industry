import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CircleCheck,
  Clock3,
  DollarSign,
  FileText,
  Gauge,
  HelpCircle,
  MessageSquare,
  Printer,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import {
  clientText,
  ClientDataError,
  Metric,
  PageIntro,
  Panel,
  PanelHeader,
  QuickLink,
  Tag,
  useClientDashboard,
  type ClientRequest,
  type ClientConsultation,
} from './client-dashboard-shell';

type UnifiedItem =
  | {
      type: 'print';
      id: string;
      reference: string;
      title: string;
      status: string;
      statusAr: string;
      statusEn: string;
      createdAt: string | Date;
      original: ClientRequest;
    }
  | {
      type: 'consultation';
      id: string;
      reference: string;
      title: string;
      status: string;
      statusAr: string;
      statusEn: string;
      createdAt: string | Date;
      original: ClientConsultation;
    };

function formatDate(value: string | Date | undefined, language: 'ar' | 'en') {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' }).format(date);
  } catch {
    return '—';
  }
}

const printStages: string[] = ['submitted', 'reviewing', 'quoted', 'in_queue', 'completed'];
const consultStages: string[] = ['submitted', 'reviewing', 'in_queue', 'contacted', 'completed'];

function getStageLabel(language: 'ar' | 'en', status: string) {
  const labels: Record<string, [string, string]> = {
    submitted: ['تم الاستلام', 'Received'],
    reviewing: ['قيد المراجعة والدراسة', 'Under Review'],
    quoted: ['تم التسعير', 'Quoted'],
    in_queue: ['في طابور التنفيذ والجدولة', 'In Queue'],
    inqueued: ['في طابور التنفيذ والجدولة', 'In Queue'],
    scheduled: ['في طابور الإنتاج / مجدول', 'In Queue / Scheduled'],
    contacted: ['تم التواصل وتحديد الموعد', 'Contacted & Scheduled'],
    completed: ['مكتمل وجاهز للتسليم', 'Completed'],
    suspended: ['معلّق مؤقتاً', 'Suspended'],
  };
  return labels[status]?.[language === 'ar' ? 0 : 1] || status;
}

function getStatusTone(status: string): 'green' | 'blue' | 'amber' {
  if (status === 'completed') return 'green';
  if (status === 'quoted' || status === 'contacted') return 'green';
  if (status === 'submitted' || status === 'suspended') return 'amber';
  return 'blue';
}

export function ClientOverviewPage() {
  const { language, profile, requests, consultations, isLoading, error, refresh } = useClientDashboard();
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'print' | 'consult'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Unify items
  const unifiedItems: UnifiedItem[] = [
    ...requests.map((r) => ({
      type: 'print' as const,
      id: r.id,
      reference: r.reference,
      title: r.projectName,
      status: r.status,
      statusAr: r.statusAr || getStageLabel('ar', r.status),
      statusEn: r.statusEn || getStageLabel('en', r.status),
      createdAt: r.createdAt,
      original: r,
    })),
    ...consultations.map((c) => ({
      type: 'consultation' as const,
      id: c.id,
      reference: c.reference,
      title: c.title,
      status: c.status,
      statusAr: c.statusAr || getStageLabel('ar', c.status),
      statusEn: c.statusEn || getStageLabel('en', c.status),
      createdAt: c.createdAt,
      original: c,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalCount = unifiedItems.length;
  const activeCount = unifiedItems.filter((item) => item.status !== 'completed').length;
  const latestItem = unifiedItems[0];
  const clientFirstName = (profile?.name || '').trim().split(' ')[0] || (language === 'ar' ? 'عميلنا' : 'Client');

  const filteredItems = unifiedItems.filter((item) => {
    if (categoryFilter === 'print' && item.type !== 'print') return false;
    if (categoryFilter === 'consult' && item.type !== 'consultation') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.reference?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q) ||
      item.statusAr?.toLowerCase().includes(q) ||
      item.statusEn?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full">
      <PageIntro
        code="CLIENT / 01 — OVERVIEW"
        title={clientText(language, `مرحباً، ${clientFirstName}`, `Welcome, ${clientFirstName}`)}
        description={clientText(
          language,
          'هذه مساحة موحدة لمتابعة كافة طلباتك: التصنيع والطباعة ثلاثية الأبعاد، واستشارات الخبراء الهندسيين مع انعكاس لحظي لقرارات الفريق الإداري.',
          'Unified workspace for all your orders: 3D printing manufacture and engineering specialist consultations with real-time status reflection from admin.',
        )}
        action={
          <Tag tone={error && !isLoading ? 'amber' : 'green'}>
            {clientText(language, error && !isLoading ? 'البيانات غير متاحة' : 'حساب موثق', error && !isLoading ? 'DATA UNAVAILABLE' : 'VERIFIED ACCOUNT')}
          </Tag>
        }
      />

      {error && !isLoading ? (
        <ClientDataError language={language} onRetry={() => void refresh()} />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="TOTAL REQUESTS"
              value={isLoading ? '—' : String(totalCount).padStart(2, '0')}
              note={clientText(language, `${requests.length} طباعة · ${consultations.length} استشارة`, `${requests.length} print · ${consultations.length} consult`)}
              icon={FileText}
            />
            <Metric
              label="IN PROGRESS"
              value={isLoading ? '—' : String(activeCount).padStart(2, '0')}
              note={clientText(language, 'طلبات قيد المراجعة أو التنفيذ', 'Under review or in execution')}
              icon={Activity}
            />
            <Metric
              label="LAST STATUS"
              value={isLoading ? '—' : latestItem?.status ? latestItem.status.toUpperCase() : '—'}
              note={latestItem ? (language === 'ar' ? latestItem.statusAr : latestItem.statusEn) : clientText(language, 'لا توجد طلبات', 'No requests yet')}
              icon={Gauge}
            />
            <Metric
              label="ACCOUNT"
              value={profile?.company ? 'READY' : 'ACTIVE'}
              note={profile?.company || clientText(language, 'أضف اسم الشركة من الإعدادات', 'Add your company in settings')}
              icon={CircleCheck}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
            <Panel>
              <PanelHeader
                eyebrow="ORDERS / LIVE STATUS"
                title={clientText(language, 'طلباتك وحالتها في سير العمل', 'Your orders & workflow status')}
                action={
                  <div className="flex items-center gap-3">
                    <Link href="/client/printing" className="font-code text-[9px] text-primary hover:underline">
                      {clientText(language, '+ طلب طباعة', '+ PRINT')}
                    </Link>
                    <span className="text-border">|</span>
                    <Link href="/client/consultations" className="font-code text-[9px] text-primary hover:underline">
                      {clientText(language, '+ استشارة', '+ CONSULT')}
                    </Link>
                  </div>
                }
              />

              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">{clientText(language, 'جارٍ تحميل بياناتك…', 'Loading your data…')}</div>
              ) : unifiedItems.length === 0 ? (
                <div className="p-6">
                  <p className="font-display text-xl font-bold">{clientText(language, 'لا توجد طلبات محفوظة بعد', 'No saved requests yet')}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {clientText(
                      language,
                      'ابدأ بطلب طباعة ثلاثية الأبعاد أو استشارة هندسية متخصصة، وستظهر هنا مع تتبع مرحلي لخطوات المراجعة والإنتاج.',
                      'Start a 3D printing request or engineering consultation, and track its review and execution steps right here.',
                    )}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/client/printing"
                      className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-bold text-primary-foreground"
                    >
                      <Printer className="size-4" />
                      {clientText(language, 'طلب طباعة ثلاثية الأبعاد', 'Start 3D Print Request')}
                    </Link>
                    <Link
                      href="/client/consultations"
                      className="inline-flex h-10 items-center gap-2 border border-border bg-secondary/30 px-4 text-xs font-bold text-foreground hover:border-primary"
                    >
                      <MessageSquare className="size-4" />
                      {clientText(language, 'طلب استشارة هندسية', 'Request Consultation')}
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Category Filter Tabs & Search */}
                  <div className="flex flex-col gap-3 border-b border-border/70 bg-secondary/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter('all')}
                        className={`px-3 py-1 font-code text-xs transition-colors rounded-sm ${
                          categoryFilter === 'all'
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {clientText(language, 'الكل', 'All')} ({unifiedItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryFilter('print')}
                        className={`px-3 py-1 font-code text-xs transition-colors rounded-sm ${
                          categoryFilter === 'print'
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {clientText(language, 'طباعة 3D', '3D Print')} ({requests.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryFilter('consult')}
                        className={`px-3 py-1 font-code text-xs transition-colors rounded-sm ${
                          categoryFilter === 'consult'
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {clientText(language, 'استشارات وخبراء', 'Consultations')} ({consultations.length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={clientText(language, 'بحث بالمشروع أو المرجع…', 'Search ref, title…')}
                        className="h-8 w-full rounded border border-border/80 bg-background/80 pl-3 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                      <Search className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          title="مسح"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtered Unified Items List */}
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        {clientText(language, 'لا توجد طلبات مطابقة للبحث المحدد.', 'No requests match your current filters.')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setCategoryFilter('all');
                        }}
                        className="mt-2 text-primary underline hover:text-primary/80"
                      >
                        {clientText(language, 'إعادة تعيين التصفية', 'Reset filters')}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/70 max-h-[540px] overflow-y-auto overscroll-contain">
                      {filteredItems.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-secondary/15 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Request Type Badge */}
                              <span className="font-code text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/80 px-2 py-0.5 rounded-sm">
                                {item.type === 'print'
                                  ? clientText(language, 'طباعة 3D', '3D PRINT')
                                  : item.original.kind === 'specialist'
                                  ? clientText(language, 'طلب خبير متخصص', 'SPECIALIST')
                                  : clientText(language, 'استشارة هندسية', 'CONSULTATION')}
                              </span>

                              {/* Workflow Status Badge */}
                              <Tag tone={getStatusTone(item.status)}>
                                {language === 'ar' ? item.statusAr : item.statusEn}
                              </Tag>

                              <span className="font-code text-[9px] text-muted-foreground font-mono">
                                {item.reference}
                              </span>

                              {/* Price tag if quoted */}
                              {item.type === 'print' && item.original.quoteAmount !== undefined && (
                                <Tag tone="green">
                                  {item.original.quoteAmount} {item.original.quoteCurrency || 'SAR'}
                                </Tag>
                              )}

                              {/* Meeting time if scheduled */}
                              {item.type === 'consultation' && (item.original as any).meetingScheduledAt && (
                                <span className="inline-flex items-center gap-1 font-code text-[9px] text-accent font-semibold">
                                  <Calendar className="size-3" />
                                  {new Date((item.original as any).meetingScheduledAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            <p className="mt-2 truncate font-display text-base font-bold sm:text-lg">
                              {item.title}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.type === 'print' ? (
                                <>
                                  {item.original.material} · {item.original.quantity} {clientText(language, 'قطعة', 'units')} ·{' '}
                                  {formatDate(item.createdAt, language)}
                                </>
                              ) : (
                                <>
                                  {(item.original as any).specialty ? `${(item.original as any).specialty} · ` : ''}
                                  {(item.original as any).assignedSpecialist
                                    ? `${clientText(language, 'المهندس المشرف:', 'Specialist:')} ${(item.original as any).assignedSpecialist} · `
                                    : ''}
                                  {formatDate(item.createdAt, language)}
                                </>
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary hover:underline sm:text-sm"
                          >
                            {clientText(language, 'عرض التفاصيل والمتابعة', 'View status')} <span aria-hidden>↗</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHeader eyebrow="ACCESS / ACTIONS" title={clientText(language, 'اختصارات سريعة', 'Quick actions')} />
              <div className="grid gap-3 p-5 sm:p-6">
                <QuickLink
                  href="/client/printing"
                  code="PRINT / 01"
                  title={clientText(language, 'طلب طباعة ثلاثية الأبعاد', 'New 3D print request')}
                  description={clientText(language, 'أرسل الملفات والمواصفات للتسعير والتصنيع', 'Send CAD files & specs for quote')}
                  icon={Printer}
                />
                <QuickLink
                  href="/client/consultations"
                  code="CONSULT / 02"
                  title={clientText(language, 'طلب استشارة أو خبير هندسي', 'Request consultation / expert')}
                  description={clientText(language, 'جلسات استشارية فنية وتعيين مهندس مختص', 'Technical advisory sessions & expert advice')}
                  icon={MessageSquare}
                />
                <QuickLink
                  href="/client/settings"
                  code="ACCOUNT / 03"
                  title={clientText(language, 'تحديث بيانات الحساب', 'Update account details')}
                  description={clientText(language, 'الاسم والشركة وتفضيلات اللغة', 'Name, company, and preferences')}
                  icon={FileText}
                />
              </div>
            </Panel>
          </div>

          <div className="mt-4 flex items-center gap-3 border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground">
            <Clock3 className="size-4 shrink-0 text-primary" />
            {clientText(
              language,
              'تنعكس حالات الطلب (مراجعة، في الطابور، تسعير، مجدول، مكتمل، معلق) مباشرة فور تعديلها من المشرف الهندسي في لوحة الإدارة.',
              'All request statuses (Under Review, In Queue, Quoted, Scheduled, Completed, Suspended) reflect instantaneously when modified by the admin.',
            )}
          </div>
        </>
      )}

      {/* Detail Modal Dialog */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-item-detail-title"
        >
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="absolute inset-0 cursor-default"
            aria-label={clientText(language, 'إغلاق التفاصيل', 'Close details')}
          />
          <section className="relative z-10 max-h-[90dvh] w-full max-w-2xl overflow-y-auto border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-7">
              <div>
                <p className="font-code text-[9px] tracking-[.18em] text-primary">
                  {selectedItem.type === 'print' ? 'PRINT WORK ORDER' : 'CONSULTATION REQUEST'} / {selectedItem.reference}
                </p>
                <h2 id="client-item-detail-title" className="mt-2 font-display text-2xl font-bold">
                  {selectedItem.title}
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(selectedItem.createdAt, language)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="grid size-9 place-items-center border border-border text-muted-foreground hover:border-primary hover:text-primary"
                aria-label={clientText(language, 'إغلاق', 'Close')}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-6 p-5 sm:p-7">
              {/* Suspended Alert */}
              {selectedItem.status === 'suspended' && (
                <div className="border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
                  <p className="font-code text-[10px] tracking-wider text-amber-400 font-bold uppercase flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    <span>{clientText(language, 'تنبيه: الطلب معلّق مؤقتاً', 'STATUS: TEMPORARILY SUSPENDED')}</span>
                  </p>
                  <p className="mt-1 leading-relaxed text-foreground/90">
                    {clientText(
                      language,
                      'تم تعليق هذا الطلب مؤقتاً من قِبل الفريق الهندسي لمراجعة المتطلبات أو استكمال التوضيحات. بإمكانك مراجعة الملاحظات أدناه أو التواصل معنا.',
                      'This request has been temporarily suspended by engineering for requirement verification. Please review the notes below.',
                    )}
                  </p>
                </div>
              )}

              {/* 3D Print: Quote Banner */}
              {selectedItem.type === 'print' && selectedItem.original.quoteAmount !== undefined && (
                <div className="border border-primary/40 bg-primary/10 p-4">
                  <p className="font-code text-[10px] tracking-wider text-primary font-bold uppercase flex items-center gap-1.5">
                    <DollarSign className="size-4" />
                    <span>{clientText(language, 'التسعير المعتمد من الإدارة الهندسية', 'OFFICIAL ENGINEERING QUOTE')}</span>
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">
                    {selectedItem.original.quoteAmount} {selectedItem.original.quoteCurrency || 'SAR'}
                  </p>
                  {selectedItem.original.estimatedDelivery && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {clientText(language, 'موعد التسليم التقديري:', 'Estimated Delivery Date:')}{' '}
                      <strong className="text-foreground font-mono">
                        {new Date(selectedItem.original.estimatedDelivery).toLocaleDateString()}
                      </strong>
                    </p>
                  )}
                </div>
              )}

              {/* Consultation: Specialist & Meeting Banner */}
              {selectedItem.type === 'consultation' &&
                ((selectedItem.original as any).assignedSpecialist ||
                  (selectedItem.original as any).meetingScheduledAt ||
                  (selectedItem.original as any).adminResponse) && (
                  <div className="border border-primary/30 bg-primary/10 p-4 space-y-2">
                    <p className="font-code text-[10px] uppercase text-primary font-bold">
                      {clientText(language, 'تنسيق واستجابة الفريق الهندسي', 'ENGINEERING RESPONSE & COORDINATION')}
                    </p>
                    {(selectedItem.original as any).assignedSpecialist && (
                      <p className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                        <UserCheck className="size-3.5 text-primary" />
                        <span>{clientText(language, 'المهندس المشرف المعين:', 'Assigned Specialist:')}</span>{' '}
                        <span className="text-primary font-bold">{(selectedItem.original as any).assignedSpecialist}</span>
                      </p>
                    )}
                    {(selectedItem.original as any).meetingScheduledAt && (
                      <p className="text-xs text-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-accent" />
                        <span>{clientText(language, 'موعد الجلسة الاستشارية:', 'Scheduled Meeting:')}</span>{' '}
                        <span className="text-accent font-semibold font-mono">
                          {new Date((selectedItem.original as any).meetingScheduledAt).toLocaleString()}
                        </span>
                      </p>
                    )}
                    {(selectedItem.original as any).adminResponse && (
                      <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap pt-2 border-t border-primary/20">
                        {(selectedItem.original as any).adminResponse}
                      </p>
                    )}
                  </div>
                )}

              {/* 3D Print: Admin Feedback */}
              {selectedItem.type === 'print' && selectedItem.original.adminFeedback && (
                <div className="border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <p className="font-code text-[10px] tracking-wider text-emerald-400 font-bold uppercase">
                    {clientText(language, 'ملاحظات وتوجيهات الفريق الهندسي', 'ENGINEERING NOTES & GUIDANCE')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {selectedItem.original.adminFeedback}
                  </p>
                </div>
              )}

              {/* Workflow Journey Stepper */}
              <div>
                <p className="font-code text-[9px] tracking-[.18em] text-primary">
                  {clientText(language, 'مراحل سير العمل', 'WORKFLOW STAGES')}
                </p>
                <div className="mt-4 grid gap-3">
                  {(selectedItem.type === 'print' ? printStages : consultStages).map((stage, index) => {
                    const currentStages = selectedItem.type === 'print' ? printStages : consultStages;
                    // Map aliases
                    const normalizedStatus =
                      selectedItem.status === 'scheduled' || selectedItem.status === 'inqueued'
                        ? 'in_queue'
                        : selectedItem.status;
                    const currentIndex = currentStages.indexOf(normalizedStatus);
                    const reached = currentIndex >= 0 && index <= currentIndex;
                    const isCurrent = normalizedStatus === stage;

                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span
                          className={`grid size-7 place-items-center rounded-full border font-code text-[9px] ${
                            reached
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {reached ? '✓' : String(index + 1).padStart(2, '0')}
                        </span>
                        <span className={`text-sm ${reached ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {getStageLabel(language, stage)}
                        </span>
                        {isCurrent && (
                          <Tag tone={selectedItem.status === 'completed' ? 'green' : 'blue'}>
                            {clientText(language, 'الحالة الحالية', 'CURRENT')}
                          </Tag>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Specifications / Details */}
              {selectedItem.type === 'print' ? (
                <>
                  <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
                    <div>
                      <p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'المادة', 'MATERIAL')}</p>
                      <p className="mt-1 text-sm font-semibold">{selectedItem.original.material}</p>
                    </div>
                    <div>
                      <p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'الكمية', 'QUANTITY')}</p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedItem.original.quantity} {clientText(language, 'قطعة', 'units')}
                      </p>
                    </div>
                    <div>
                      <p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'التشطيب', 'FINISH')}</p>
                      <p className="mt-1 text-sm font-semibold">{selectedItem.original.finish}</p>
                    </div>
                    <div>
                      <p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'الجدول', 'TIMELINE')}</p>
                      <p className="mt-1 text-sm font-semibold">{selectedItem.original.timeline}</p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-5">
                    <p className="font-code text-[9px] text-muted-foreground">
                      {clientText(language, 'المواصفات والملاحظات المقدمة من طرفك', 'SUBMITTED SPECIFICATIONS')}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {selectedItem.original.notes || clientText(language, 'لا توجد ملاحظات إضافية.', 'No additional notes.')}
                    </p>
                  </div>
                </>
              ) : (
                <div className="border-t border-border pt-5 space-y-4">
                  {(selectedItem.original as any).specialty && (
                    <div>
                      <p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'التخصص المطلوب', 'SPECIALTY')}</p>
                      <p className="mt-1 text-sm font-semibold">{(selectedItem.original as any).specialty}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'تفاصيل الاستشارة المقدمة', 'SUBMITTED DETAILS')}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {(selectedItem.original as any).details}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ClientOverviewPage;
