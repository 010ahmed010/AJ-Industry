import { useState } from 'react';
import { Activity, CircleCheck, Clock3, FileText, Gauge, MessageSquare, Printer, RefreshCw, X } from 'lucide-react';
import { Link } from 'wouter';
import { clientText, ClientDataError, Metric, PageIntro, Panel, PanelHeader, QuickLink, Tag, useClientDashboard, type ClientRequest } from './client-dashboard-shell';

function requestStatus(language: 'ar' | 'en', request: ClientRequest) {
  return language === 'ar' ? (request.statusAr || request.status) : (request.statusEn || request.status);
}

function requestDate(value: string | Date | undefined, language: 'ar' | 'en') {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' }).format(date);
  } catch {
    return '—';
  }
}

const requestStages: ClientRequest['status'][] = ['submitted', 'reviewing', 'quoted', 'scheduled', 'completed'];

function requestStageLabel(language: 'ar' | 'en', status: ClientRequest['status']) {
  const labels: Record<ClientRequest['status'], [string, string]> = {
    submitted: ['تم الاستلام', 'Received'],
    reviewing: ['قيد المراجعة', 'Under review'],
    quoted: ['تم التسعير', 'Quoted'],
    scheduled: ['مجدول', 'Scheduled'],
    completed: ['مكتمل', 'Completed'],
  };
  return labels[status]?.[language === 'ar' ? 0 : 1] || status;
}

export function ClientOverviewPage() {
  const { language, profile, requests, isLoading, error, refresh } = useClientDashboard();
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const activeCount = requests.filter((request) => request.status !== 'completed').length;
  const latest = requests[0];
  const clientFirstName = (profile?.name || '').trim().split(' ')[0] || (language === 'ar' ? 'عميلنا' : 'Client');
  return <div className="w-full">
    <PageIntro code="CLIENT / 01 — OVERVIEW" title={clientText(language, `مرحباً، ${clientFirstName}`, `Welcome, ${clientFirstName}`)} description={clientText(language, 'هذه مساحة حقيقية لطلباتك الهندسية وحالة كل طلب محفوظ على حسابك.', 'A real workspace for your engineering requests and the status of every request saved to your account.')} action={<Tag tone={error && !isLoading ? 'amber' : 'green'}>{clientText(language, error && !isLoading ? 'البيانات غير متاحة' : 'حساب موثق', error && !isLoading ? 'DATA UNAVAILABLE' : 'VERIFIED ACCOUNT')}</Tag>} />
    {error && !isLoading ? <ClientDataError language={language} onRetry={() => void refresh()} /> : <><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="TOTAL REQUESTS" value={isLoading ? '—' : String(requests.length).padStart(2, '0')} note={clientText(language, 'كل الطلبات المحفوظة', 'All saved requests')} icon={FileText} /><Metric label="ACTIVE" value={isLoading ? '—' : String(activeCount).padStart(2, '0')} note={clientText(language, 'طلبات بانتظار إجراء', 'Requests still in progress')} icon={Activity} /><Metric label="LAST STATUS" value={isLoading ? '—' : latest?.status ? latest.status.toUpperCase() : '—'} note={latest ? requestStatus(language, latest) : clientText(language, 'لا توجد طلبات', 'No requests yet')} icon={Gauge} /><Metric label="ACCOUNT" value={profile?.company ? 'READY' : 'OPEN'} note={profile?.company || clientText(language, 'أضف اسم الشركة من الإعدادات', 'Add your company in settings')} icon={CircleCheck} /></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
      <Panel><PanelHeader eyebrow="REQUESTS / PERSISTED" title={clientText(language, 'طلباتك الأخيرة', 'Your recent requests')} action={<Link href="/client/printing" className="font-code text-[9px] text-primary hover:underline">{clientText(language, 'طلب جديد', 'NEW REQUEST')}</Link>} />{isLoading ? <div className="p-6 text-sm text-muted-foreground">{clientText(language, 'جارٍ تحميل بياناتك…', 'Loading your data…')}</div> : requests.length === 0 ? <div className="p-6"><p className="font-display text-xl font-bold">{clientText(language, 'لا توجد طلبات محفوظة بعد', 'No saved requests yet')}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{clientText(language, 'ابدأ بطلب طباعة ثلاثية الأبعاد، وسيظهر هنا مع مرجعه وحالته.', 'Start a 3D printing request and it will appear here with its reference and status.')}</p><Link href="/client/printing" className="mt-6 inline-flex h-11 items-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground"><Printer className="size-4" />{clientText(language, 'ابدأ طلباً', 'Start a request')}</Link></div> : <div className="divide-y divide-border/70">{requests.map((request) => <div key={request.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Tag tone={request.status === 'completed' ? 'green' : request.status === 'submitted' ? 'amber' : 'blue'}>{requestStatus(language, request)}</Tag><span className="font-code text-[9px] text-muted-foreground">{request.reference}</span>{request.quoteAmount !== undefined && <Tag tone="green">{request.quoteAmount} {request.quoteCurrency || 'USD'}</Tag>}</div><p className="mt-3 truncate font-display text-lg font-bold">{request.projectName}</p><p className="mt-1 text-xs text-muted-foreground">{request.material} · {request.quantity} {clientText(language, 'قطعة', 'units')} · {requestDate(request.createdAt, language)}</p></div><button type="button" onClick={() => setSelectedRequest(request)} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary hover:underline">{clientText(language, 'عرض التفاصيل', 'View details')} <span aria-hidden>↗</span></button></div>)}</div>}</Panel>
      <Panel><PanelHeader eyebrow="ACCESS / ACTIONS" title={clientText(language, 'اختصارات حقيقية', 'Useful shortcuts')} /><div className="grid gap-3 p-5 sm:p-6"><QuickLink href="/client/printing" code="PRINT / 01" title={clientText(language, 'طلب طباعة جديد', 'New print request')} description={clientText(language, 'أرسل المواصفات لفريق الهندسة', 'Send specifications to engineering')} icon={Printer} /><QuickLink href="/client/consultations" code="CONSULT / 02" title={clientText(language, 'طلب استشارة هندسية', 'Request consultation')} description={clientText(language, 'استشر فريق المهندسين والمتخصصين', 'Consult our engineering specialist team')} icon={MessageSquare} /><QuickLink href="/client/settings" code="ACCOUNT / 03" title={clientText(language, 'تحديث بيانات الحساب', 'Update account details')} description={clientText(language, 'الاسم والشركة واللغة', 'Name, company, and language')} icon={FileText} /></div></Panel>
    </div>
     <div className="mt-4 flex items-center gap-3 border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0 text-primary" />{clientText(language, 'حالة الطلب والتسعير تتغير فور اعتمادها من فريق إدارة AJ، وتتزامن فورياً مع لوحة الإدارة.', 'Order status and quotes update immediately when modified in the AJ Admin Portal and sync in real time.')}</div></>}
    {selectedRequest && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="client-request-detail-title"><button type="button" onClick={() => setSelectedRequest(null)} className="absolute inset-0 cursor-default" aria-label={clientText(language, 'إغلاق التفاصيل', 'Close details')} /><section className="relative z-10 max-h-[90dvh] w-full max-w-2xl overflow-y-auto border border-border bg-card shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-7"><div><p className="font-code text-[9px] tracking-[.18em] text-primary">REQUEST / {selectedRequest.reference}</p><h2 id="client-request-detail-title" className="mt-2 font-display text-2xl font-bold">{selectedRequest.projectName}</h2><p className="mt-2 text-xs text-muted-foreground">{requestDate(selectedRequest.createdAt, language)}</p></div><button type="button" onClick={() => setSelectedRequest(null)} className="grid size-9 place-items-center border border-border text-muted-foreground hover:border-primary hover:text-primary" aria-label={clientText(language, 'إغلاق', 'Close')}><X className="size-4" /></button></div><div className="grid gap-6 p-5 sm:p-7">
    {selectedRequest.quoteAmount !== undefined && (
      <div className="border border-primary/40 bg-primary/10 p-4">
        <p className="font-code text-[10px] tracking-wider text-primary font-bold uppercase">{clientText(language, 'التسعير المعتمد من الإدارة', 'OFFICIAL ADMIN QUOTE')}</p>
        <p className="mt-1 font-display text-2xl font-bold text-foreground">{selectedRequest.quoteAmount} {selectedRequest.quoteCurrency || 'USD'}</p>
        {selectedRequest.estimatedDelivery && (
          <p className="mt-1 text-xs text-muted-foreground">{clientText(language, 'موعد التسليم المتوقع:', 'Estimated Delivery Date:')} <strong className="text-foreground">{new Date(selectedRequest.estimatedDelivery).toLocaleDateString()}</strong></p>
        )}
      </div>
    )}
    {selectedRequest.adminFeedback && (
      <div className="border border-emerald-500/40 bg-emerald-500/10 p-4">
        <p className="font-code text-[10px] tracking-wider text-emerald-400 font-bold uppercase">{clientText(language, 'ملاحظات وتوجيهات الفريق الهندسي', 'ENGINEERING NOTES & GUIDANCE')}</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{selectedRequest.adminFeedback}</p>
      </div>
    )}
    <div><p className="font-code text-[9px] tracking-[.18em] text-primary">{clientText(language, 'رحلة الطلب', 'REQUEST JOURNEY')}</p><div className="mt-4 grid gap-3">{requestStages.map((stage, index) => { const currentIndex = requestStages.indexOf(selectedRequest.status); const reached = index <= currentIndex; return <div key={stage} className="flex items-center gap-3"><span className={`grid size-7 place-items-center rounded-full border font-code text-[9px] ${reached ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{reached ? '✓' : String(index + 1).padStart(2, '0')}</span><span className={`text-sm ${reached ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{requestStageLabel(language, stage)}</span>{stage === selectedRequest.status && <Tag tone={selectedRequest.status === 'completed' ? 'green' : 'blue'}>{clientText(language, 'الحالة الحالية', 'CURRENT')}</Tag>}</div>; })}</div></div><div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2"><div><p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'المادة', 'MATERIAL')}</p><p className="mt-1 text-sm font-semibold">{selectedRequest.material}</p></div><div><p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'الكمية', 'QUANTITY')}</p><p className="mt-1 text-sm font-semibold">{selectedRequest.quantity} {clientText(language, 'قطعة', 'units')}</p></div><div><p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'التشطيب', 'FINISH')}</p><p className="mt-1 text-sm font-semibold">{selectedRequest.finish}</p></div><div><p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'الجدول', 'TIMELINE')}</p><p className="mt-1 text-sm font-semibold">{selectedRequest.timeline}</p></div></div><div className="border-t border-border pt-5"><p className="font-code text-[9px] text-muted-foreground">{clientText(language, 'الملاحظات الهندسية المقدمة من طرفك', 'YOUR SUBMITTED SPECIFICATIONS')}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{selectedRequest.notes || clientText(language, 'لا توجد ملاحظات إضافية.', 'No additional notes.')}</p></div></div></section></div>}
  </div>;
}

export default ClientOverviewPage;