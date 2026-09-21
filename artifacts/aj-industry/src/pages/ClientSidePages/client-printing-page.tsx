import { type FormEvent, useState } from 'react';
import { useCreateClientPrintRequest, getGetClientOverviewQueryKey, customFetch } from '@workspace/api-client-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  Check,
  CircleCheck,
  DollarSign,
  Edit3,
  Info,
  Lock,
  Package,
  Printer,
  RefreshCw,
  Search,
  Send,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import {
  clientText,
  ClientDataError,
  PageIntro,
  Panel,
  PanelHeader,
  Tag,
  useClientDashboard,
  type ClientRequest,
} from './client-dashboard-shell';

type PrintForm = { projectName: string; material: string; finish: string; quantity: string; timeline: string; notes: string };
const initialForm: PrintForm = { projectName: '', material: 'PETG-CF', finish: 'functional', quantity: '1', timeline: 'standard', notes: '' };

function requestStatus(language: 'ar' | 'en', status: string, request?: ClientRequest) {
  if (language === 'ar' && request?.statusAr) return request.statusAr;
  if (language === 'en' && request?.statusEn) return request.statusEn;
  const labels: Record<string, [string, string]> = {
    submitted: ['تم الاستلام', 'Received'],
    reviewing: ['قيد المراجعة الهندسية', 'Under Engineering Review'],
    quoted: ['تم التسعير', 'Quoted'],
    in_queue: ['في طابور التنفيذ والجدولة', 'In Queue'],
    inqueued: ['في طابور التنفيذ والجدولة', 'In Queue'],
    scheduled: ['مجدول للإنتاج', 'Scheduled for Production'],
    completed: ['مكتمل وجاهز للتسليم', 'Completed'],
    suspended: ['معلّق مؤقتاً', 'Suspended'],
  };
  return labels[status]?.[language === 'ar' ? 0 : 1] ?? status;
}

function SavedPrintRequests({
  requests,
  isLoading,
  language,
  onUpdated,
}: {
  requests: ClientRequest[];
  isLoading: boolean;
  language: 'ar' | 'en';
  onUpdated?: () => void;
}) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRequest, setEditingRequest] = useState<ClientRequest | null>(null);
  const [editForm, setEditForm] = useState<PrintForm>(initialForm);
  const [requestToDelete, setRequestToDelete] = useState<ClientRequest | null>(null);
  const [actionError, setActionError] = useState('');

  const editMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<PrintForm> }) => {
      return customFetch(`/api/client/requests/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...payload.data,
          quantity: payload.data.quantity ? Number(payload.data.quantity) : undefined,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['client-requests'] });
      void queryClient.invalidateQueries({ queryKey: getGetClientOverviewQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setEditingRequest(null);
      setActionError('');
      onUpdated?.();
    },
    onError: (err: any) => {
      setActionError(err?.message || clientText(language, 'تعذر تعديل الطلب', 'Failed to update request'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return customFetch(`/api/client/requests/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['client-requests'] });
      void queryClient.invalidateQueries({ queryKey: getGetClientOverviewQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setRequestToDelete(null);
      setActionError('');
      onUpdated?.();
    },
    onError: (err: any) => {
      setActionError(err?.message || clientText(language, 'تعذر حذف الطلب', 'Failed to delete request'));
    },
  });

  const openEdit = (r: ClientRequest) => {
    setActionError('');
    setEditingRequest(r);
    setEditForm({
      projectName: r.projectName || '',
      material: r.material || 'PETG-CF',
      finish: r.finish || 'functional',
      quantity: String(r.quantity || 1),
      timeline: r.timeline || 'standard',
      notes: r.notes || '',
    });
  };

  if (isLoading) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        {clientText(language, 'جارٍ التحميل…', 'Loading…')}
      </p>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-6 text-sm leading-7 text-muted-foreground">
        {clientText(
          language,
          'لم ترسل طلبات بعد. استخدم النموذج لإرسال أول طلب.',
          'You have not sent any requests yet. Use the form to send your first one.',
        )}
      </div>
    );
  }

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.projectName?.toLowerCase().includes(q) ||
      r.reference?.toLowerCase().includes(q) ||
      r.material?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
      r.statusAr?.toLowerCase().includes(q) ||
      r.statusEn?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Search & Count Subheader */}
      <div className="flex flex-col gap-2.5 border-b border-border/80 bg-secondary/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-primary" />
          <span className="font-code text-xs text-muted-foreground">
            {filteredRequests.length} / {requests.length}{' '}
            {clientText(language, 'طلب محفوظ', 'saved requests')}
          </span>
        </div>

        {(requests.length > 2 || searchQuery) && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={clientText(
                language,
                'البحث بالمرجع أو اسم المشروع…',
                'Search project, ref, material…',
              )}
              className="h-8.5 w-full rounded border border-border/80 bg-background/80 pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="مسح"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bounded Scrollable List */}
      {filteredRequests.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            {clientText(language, 'لا توجد طلبات مطابقة لبحثك.', 'No requests match your search.')}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-primary underline hover:text-primary/80"
          >
            {clientText(language, 'إعادة تعيين البحث', 'Reset search')}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border/70 max-h-[580px] overflow-y-auto overscroll-contain">
          {filteredRequests.map((request) => {
            const canEdit = request.status === 'submitted';
            const canDelete = ['submitted', 'completed', 'suspended'].includes(request.status);

            return (
              <div key={request.id} className="p-5 transition-colors hover:bg-secondary/15">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Tag
                      tone={
                        request.status === 'completed'
                          ? 'green'
                          : request.status === 'submitted'
                          ? 'amber'
                          : request.status === 'suspended'
                          ? 'amber'
                          : request.status === 'quoted'
                          ? 'green'
                          : 'blue'
                      }
                    >
                      {requestStatus(language, request.status, request)}
                    </Tag>
                    <p className="mt-2.5 font-display text-lg font-bold text-foreground">
                      {request.projectName}
                    </p>
                  </div>
                  <span className="font-code text-[9px] font-semibold text-muted-foreground">
                    {request.reference}
                  </span>
                </div>

                {request.status === 'suspended' && (
                  <div className="mt-3 border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <p className="font-bold flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                      <span>{clientText(language, 'الطلب معلّق مؤقتاً لمراجعة المتطلبات مع الإدارة الهندسية', 'Order temporarily on-hold by engineering team')}</span>
                    </p>
                  </div>
                )}

                <div className="mt-3.5 grid gap-2 border-t border-border/70 pt-3.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>
                    {clientText(language, 'المادة', 'Material')}:{' '}
                    <strong className="text-foreground">{request.material}</strong>
                  </span>
                  <span>
                    {clientText(language, 'الكمية', 'Quantity')}:{' '}
                    <strong className="text-foreground">{request.quantity}</strong>
                  </span>
                  <span>
                    {clientText(language, 'التشطيب', 'Finish')}:{' '}
                    <strong className="text-foreground">{request.finish}</strong>
                  </span>
                  <span>
                    {clientText(language, 'الجدول', 'Timeline')}:{' '}
                    <strong className="text-foreground">{request.timeline}</strong>
                  </span>
                </div>

                {/* Engineering Quotation details if provided by admin */}
                {(request.quoteAmount || request.estimatedDelivery || request.adminFeedback) && (
                  <div className="mt-3.5 border border-primary/30 bg-primary/10 p-3.5 space-y-1.5 rounded-sm">
                    <p className="font-code text-[10px] uppercase font-bold text-primary">
                      {clientText(language, 'تسعير وملاحظات الفريق الهندسي', 'ENGINEERING QUOTE & TIMELINE')}
                    </p>
                    {request.quoteAmount !== undefined && (
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <DollarSign className="size-3.5 text-primary" />
                        <span>{clientText(language, 'السعر المعتمد:', 'Quoted Price:')}</span>{' '}
                        <span className="text-primary font-mono text-sm">
                          {request.quoteAmount} {request.quoteCurrency || 'SAR'}
                        </span>
                      </p>
                    )}
                    {request.estimatedDelivery && (
                      <p className="text-xs text-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-primary" />
                        <span>{clientText(language, 'الموعد التقديري للتسليم:', 'Est. Delivery:')}</span>{' '}
                        <span className="text-accent font-semibold font-mono">
                          {new Date(request.estimatedDelivery).toLocaleDateString(
                            language === 'ar' ? 'ar-SA' : 'en-US',
                          )}
                        </span>
                      </p>
                    )}
                    {request.adminFeedback && (
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap pt-1 border-t border-primary/20">
                        {request.adminFeedback}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions row for client */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openEdit(request)}
                        className="inline-flex items-center gap-1.5 border border-border/80 bg-secondary/30 px-3 py-1.5 font-code text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Edit3 className="size-3.5" />
                        <span>{clientText(language, 'تعديل الطلب', 'Edit Request')}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-code text-[11px] text-muted-foreground/80">
                        <Lock className="size-3 text-muted-foreground" />
                        <span>
                          {request.status === 'completed'
                            ? clientText(language, 'مكتمل (غير قابل للتعديل)', 'Completed (Locked)')
                            : clientText(language, 'قيد المعالجة (التعديل مقفل)', 'In Review (Locked)')}
                        </span>
                      </span>
                    )}
                  </div>

                  <div>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setRequestToDelete(request)}
                        className="inline-flex items-center gap-1 border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 font-code text-xs font-medium text-rose-400 transition-colors hover:border-rose-500 hover:bg-rose-500/20"
                        title={clientText(language, 'حذف هذا الطلب', 'Delete this request')}
                      >
                        <Trash2 className="size-3.5" />
                        <span>{clientText(language, 'حذف', 'Delete')}</span>
                      </button>
                    ) : (
                      <span
                        className="font-code text-[10px] text-muted-foreground"
                        title={clientText(
                          language,
                          'لا يمكن حذف الطلبات أثناء جدولتها للإنتاج أو التسعير',
                          'Cannot delete orders scheduled or under production',
                        )}
                      >
                        {clientText(language, 'الحذف مقفل أثناء الإنتاج', 'Delete locked in production')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Edit Request Modal */}
      {editingRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col border border-border bg-[#0b1528] shadow-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-border p-5">
              <div>
                <span className="font-code text-[10px] tracking-widest text-primary">
                  EDIT REQUEST / {editingRequest.reference}
                </span>
                <h3 className="mt-1 font-heading text-lg font-bold text-foreground">
                  {clientText(language, 'تعديل مواصفات الطلب', 'Edit Print Request')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editMutation.mutate({ id: editingRequest.id, data: editForm });
              }}
              className="flex-1 overflow-y-auto p-5 space-y-4 text-sm"
            >
              {actionError && (
                <div className="p-3 border border-rose-500/50 bg-rose-500/10 text-rose-400 text-xs">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {clientText(language, 'اسم المشروع', 'Project Name')}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.projectName}
                  onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    {clientText(language, 'المادة', 'Material')}
                  </label>
                  <select
                    value={editForm.material}
                    onChange={(e) => setEditForm({ ...editForm, material: e.target.value })}
                    className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="PETG-CF">PETG-CF</option>
                    <option value="ABS">ABS</option>
                    <option value="ASA">ASA</option>
                    <option value="Resin">Resin</option>
                    <option value="Nylon">Nylon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    {clientText(language, 'الكمية', 'Quantity')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    {clientText(language, 'التشطيب', 'Finish')}
                  </label>
                  <select
                    value={editForm.finish}
                    onChange={(e) => setEditForm({ ...editForm, finish: e.target.value })}
                    className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="draft">Draft (سريع)</option>
                    <option value="functional">Functional (وظيفي)</option>
                    <option value="cosmetic">Cosmetic (جمالي فائق)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    {clientText(language, 'الجدول الزمني', 'Timeline')}
                  </label>
                  <select
                    value={editForm.timeline}
                    onChange={(e) => setEditForm({ ...editForm, timeline: e.target.value })}
                    className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="standard">Standard (قياسي)</option>
                    <option value="express">Express (عاجل)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {clientText(language, 'ملاحظات إضافية', 'Additional Notes')}
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder={clientText(language, 'أي تفاصيل هندسية تود تحديثها...', 'Any engineering details...')}
                  className="mt-1.5 w-full border border-border bg-secondary/40 p-3 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="h-10 border border-border px-4 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {clientText(language, 'إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="flex h-10 items-center gap-2 bg-primary px-5 font-code text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {editMutation.isPending ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  <span>{clientText(language, 'حفظ التعديلات', 'Save Changes')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Delete Confirmation Modal */}
      {requestToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md border border-rose-500/40 bg-[#0b1528] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-400">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  {clientText(language, 'تأكيد حذف الطلب', 'Confirm Delete Request')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {clientText(
                    language,
                    `هل تريد بالتأكيد حذف طلب "${requestToDelete.projectName}" (المرجع: ${requestToDelete.reference})؟`,
                    `Are you sure you want to delete "${requestToDelete.projectName}" (${requestToDelete.reference})?`,
                  )}
                </p>
                {actionError && (
                  <p className="mt-2 text-xs text-rose-400">{actionError}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => {
                  setRequestToDelete(null);
                  setActionError('');
                }}
                disabled={deleteMutation.isPending}
                className="h-9 border border-border px-4 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {clientText(language, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(requestToDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex h-9 items-center gap-2 border border-rose-500/60 bg-rose-600 px-4 font-code text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>{clientText(language, 'نعم، حذف الطلب', 'Yes, Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientPrintingPage() {
  const { language, requests, isLoading, error, refresh } = useClientDashboard();
  const queryClient = useQueryClient();
  const createRequest = useCreateClientPrintRequest();
  const [form, setForm] = useState<PrintForm>(initialForm);
  const [createdReference, setCreatedReference] = useState('');
  const [formError, setFormError] = useState('');
  const update = (key: keyof PrintForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    try {
      const result = await createRequest.mutateAsync({ data: { ...form, quantity: Number(form.quantity) } });
      setCreatedReference(result.reference);
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: getGetClientOverviewQueryKey() });
    } catch {
      setFormError(clientText(language, 'تعذر حفظ الطلب. حاول مرة أخرى.', 'The request could not be saved. Try again.'));
    }
  };
  return (
    <div className="mx-auto max-w-[1480px]">
      <PageIntro
        code="PRINT / 02 — REQUESTS"
        title={clientText(language, 'طلبات الطباعة', 'Print requests')}
        description={clientText(
          language,
          'أرسل مواصفات القطعة لفريق AJ، وتابع حالة كل طلب محفوظ على حسابك.',
          'Send your part specifications to AJ and track every saved request from your account.',
        )}
        action={<Tag>{clientText(language, 'بيانات محفوظة', 'PERSISTED DATA')}</Tag>}
      />
      {error && !isLoading ? (
        <ClientDataError language={language} onRetry={() => void refresh()} />
      ) : (
        <>
          {createdReference && (
            <div className="mt-6 flex items-start gap-3 border border-accent/40 bg-accent/10 p-5" data-testid="status-print-request-success">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <p className="font-semibold">{clientText(language, 'تم حفظ طلب الطباعة', 'Print request saved')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {clientText(
                    language,
                    `مرجع الطلب ${createdReference}. سيظهر تحديث الحالة هنا عندما يراجعه الفريق.`,
                    `Request ${createdReference}. Status updates will appear here when the team reviews it.`,
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatedReference('')}
                className="ms-auto text-xs text-primary hover:underline"
              >
                {clientText(language, 'إخفاء', 'Dismiss')}
              </button>
            </div>
          )}
          <div className="mt-7 grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
            <Panel>
              <PanelHeader
                eyebrow="REQUEST LOG"
                title={clientText(language, 'طلباتك المحفوظة', 'Your saved requests')}
              />
              <SavedPrintRequests
                requests={requests}
                isLoading={isLoading}
                language={language}
                onUpdated={() => void refresh()}
              />
            </Panel>
            <Panel>
              <PanelHeader
                eyebrow="NEW REQUEST / QUOTE"
                title={clientText(language, 'إرسال طلب طباعة جديد', 'Send a new print request')}
              />
              <form onSubmit={submit} className="grid gap-6 p-5 sm:p-7" data-testid="form-print-request">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">
                    <span>{clientText(language, 'اسم المشروع', 'Project name')}</span>
                    <input
                      required
                      minLength={2}
                      maxLength={160}
                      value={form.projectName}
                      onChange={(event) => update('projectName', event.target.value)}
                      placeholder={clientText(language, 'مثال: غطاء لوحة التحكم', 'e.g. control panel cover')}
                      className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    <span>{clientText(language, 'الكمية', 'Quantity')}</span>
                    <input
                      required
                      type="number"
                      min="1"
                      max="1000"
                      value={form.quantity}
                      onChange={(event) => update('quantity', event.target.value)}
                      className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  <label className="grid gap-2 text-sm font-semibold">
                    <span>{clientText(language, 'المادة', 'Material')}</span>
                    <select
                      value={form.material}
                      onChange={(event) => update('material', event.target.value)}
                      className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"
                    >
                      <option>PETG-CF</option>
                      <option>PLA Pro</option>
                      <option>ABS</option>
                      <option>TPU 95A</option>
                      <option>Nylon</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    <span>{clientText(language, 'نوع التشطيب', 'Finish')}</span>
                    <select
                      value={form.finish}
                      onChange={(event) => update('finish', event.target.value)}
                      className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"
                    >
                      <option value="functional">{clientText(language, 'وظيفي', 'Functional')}</option>
                      <option value="visual">{clientText(language, 'عرض بصري', 'Visual prototype')}</option>
                      <option value="production">{clientText(language, 'قريب من الإنتاج', 'Production-ready')}</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    <span>{clientText(language, 'الجدول الزمني', 'Timeline')}</span>
                    <select
                      value={form.timeline}
                      onChange={(event) => update('timeline', event.target.value)}
                      className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"
                    >
                      <option value="standard">{clientText(language, 'قياسي', 'Standard')}</option>
                      <option value="priority">{clientText(language, 'أولوية', 'Priority')}</option>
                    </select>
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">
                  <span>{clientText(language, 'ملاحظات هندسية', 'Engineering notes')}</span>
                  <textarea
                    rows={6}
                    maxLength={3000}
                    value={form.notes}
                    onChange={(event) => update('notes', event.target.value)}
                    placeholder={clientText(language, 'التفاوتات، نقاط التثبيت، أو المتطلبات الخاصة…', 'Tolerances, mounting points, or special requirements…')}
                    className="resize-none border border-input bg-background/60 px-4 py-3 text-sm leading-6 outline-none focus:border-primary"
                  />
                </label>
                {formError && <p className="text-sm text-destructive-foreground">{formError}</p>}
                <div className="flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
                  <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {clientText(language, 'سيؤكد الفريق السعر والموعد بعد مراجعة التفاصيل.', 'The team confirms price and timing after reviewing the details.')}
                  </p>
                  <button
                    disabled={createRequest.isPending}
                    type="submit"
                    className="inline-flex h-12 items-center justify-center gap-2 bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Send className="size-4" />
                    {createRequest.isPending ? clientText(language, 'جارٍ الحفظ…', 'Saving…') : clientText(language, 'إرسال الطلب', 'Send request')}
                  </button>
                </div>
              </form>
            </Panel>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4">
              <Printer className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {clientText(language, 'مراجعة هندسية للطلبات', 'Engineering review for requests')}
              </span>
            </div>
            <div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4">
              <Timer className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {clientText(language, 'حالة محفوظة لكل طلب', 'Saved status for every request')}
              </span>
            </div>
            <div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4">
              <Package className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {clientText(language, 'تنسيق التسليم بعد التأكيد', 'Delivery coordinated after confirmation')}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ClientPrintingPage;
