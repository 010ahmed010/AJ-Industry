import { type FormEvent, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  customFetch,
  getGetClientConsultationsQueryKey,
  useCreateClientConsultation,
  useGetClientConsultations,
  type ClientConsultation,
  type ClientConsultationInputProviderType,
} from '@workspace/api-client-react';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Check,
  CircleCheck,
  Clock3,
  Edit3,
  Lock,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { clientText, ClientDataError, PageIntro, Panel, PanelHeader, Tag, useClientDashboard } from './client-dashboard-shell';

type SpecialistForm = {
  title: string;
  specialty: string;
  providerType: ClientConsultationInputProviderType;
  preferredProvider: string;
  details: string;
};

const initialSpecialistForm: SpecialistForm = {
  title: '',
  specialty: '',
  providerType: 'person',
  preferredProvider: '',
  details: '',
};

function statusLabel(language: 'ar' | 'en', consultation: ClientConsultation) {
  return language === 'ar' ? consultation.statusAr : consultation.statusEn;
}

function kindLabel(language: 'ar' | 'en', kind: ClientConsultation['kind']) {
  return kind === 'consultation'
    ? clientText(language, 'استشارة هندسية', 'Engineering consultation')
    : clientText(language, 'طلب متخصص', 'Specialist request');
}

function providerLabel(language: 'ar' | 'en', providerType: ClientConsultationInputProviderType) {
  const labels: Record<ClientConsultationInputProviderType, [string, string]> = {
    person: ['مهندس أو شخص متخصص', 'Specialized person or engineer'],
    company: ['شركة متخصصة', 'Specialized company'],
    guide: ['دليل أو جهة فنية', 'Technical guide or resource'],
  };
  return labels[providerType][language === 'ar' ? 0 : 1];
}

function RequestSuccess({ reference, language }: { reference: string; language: 'ar' | 'en' }) {
  return <div className="flex items-start gap-3 border border-accent/40 bg-accent/10 p-5" data-testid="status-consultation-success">
    <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" />
    <div>
      <p className="font-semibold">{clientText(language, 'تم إرسال الطلب إلى فريق AJ', 'Request sent to the AJ team')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{clientText(language, `مرجع الطلب ${reference}. سيتواصل معك الفريق بعد المراجعة.`, `Reference ${reference}. The team will contact you after review.`)}</p>
    </div>
  </div>;
}

function ConsultationHistory({
  consultations,
  language,
  onUpdated,
}: {
  consultations: ClientConsultation[];
  language: 'ar' | 'en';
  onUpdated?: () => void;
}) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConsultation, setEditingConsultation] = useState<ClientConsultation | null>(null);
  const [editForm, setEditForm] = useState({ title: '', specialty: '', details: '' });
  const [consultationToDelete, setConsultationToDelete] = useState<ClientConsultation | null>(null);
  const [actionError, setActionError] = useState('');

  const editMutation = useMutation({
    mutationFn: async (payload: { id: string; data: { title: string; specialty?: string; details: string } }) => {
      return customFetch(`/api/client/consultations/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload.data),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getGetClientConsultationsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ['admin-consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['client-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setEditingConsultation(null);
      setActionError('');
      onUpdated?.();
    },
    onError: (err: any) => {
      setActionError(err?.message || clientText(language, 'تعذر تعديل طلب الاستشارة', 'Failed to update consultation'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return customFetch(`/api/client/consultations/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getGetClientConsultationsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ['admin-consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['client-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setConsultationToDelete(null);
      setActionError('');
      onUpdated?.();
    },
    onError: (err: any) => {
      setActionError(err?.message || clientText(language, 'تعذر حذف طلب الاستشارة', 'Failed to delete consultation'));
    },
  });

  const openEdit = (c: ClientConsultation) => {
    setActionError('');
    setEditingConsultation(c);
    setEditForm({
      title: c.title || '',
      specialty: c.specialty || '',
      details: c.details || '',
    });
  };

  if (consultations.length === 0) {
    return (
      <div className="p-6 text-sm leading-7 text-muted-foreground">
        {clientText(
          language,
          'لا توجد طلبات استشارة بعد. أرسل طلبك الأول من الأقسام أعلاه.',
          'No consultation requests yet. Send your first request from the sections above.',
        )}
      </div>
    );
  }

  const filtered = consultations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.reference?.toLowerCase().includes(q) ||
      c.details?.toLowerCase().includes(q) ||
      c.specialty?.toLowerCase().includes(q) ||
      (c as any).assignedSpecialist?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Search and stats bar */}
      <div className="flex flex-col gap-2.5 border-b border-border/80 bg-secondary/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-primary" />
          <span className="font-code text-xs text-muted-foreground">
            {filtered.length} / {consultations.length}{' '}
            {clientText(language, 'طلب استشارة محفوظ', 'saved consultation requests')}
          </span>
        </div>

        {(consultations.length > 2 || searchQuery) && (
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={clientText(language, 'البحث بالمرجع، العنوان، أو المجال...', 'Search ref, title, specialty...')}
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

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            {clientText(language, 'لا توجد نتائج مطابقة لبحثك.', 'No requests match your search.')}
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
        <div className="divide-y divide-border/70 max-h-[540px] overflow-y-auto overscroll-contain">
          {filtered.map((consultation) => {
            const c = consultation as any;
            const canEdit = consultation.status === 'submitted';
            const canDelete = ['submitted', 'completed', 'suspended'].includes(consultation.status);

            return (
              <div key={consultation.id} className="flex flex-col gap-3 p-5 sm:p-6 transition-colors hover:bg-secondary/15">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag
                        tone={
                          consultation.status === 'completed'
                            ? 'green'
                            : consultation.status === 'submitted'
                            ? 'amber'
                            : consultation.status === 'suspended'
                            ? 'amber'
                            : 'blue'
                        }
                      >
                        {statusLabel(language, consultation)}
                      </Tag>
                      <span className="font-code text-[9px] text-muted-foreground font-semibold">
                        {consultation.reference}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-lg font-bold">{consultation.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {kindLabel(language, consultation.kind)}
                      {consultation.specialty ? ` · ${consultation.specialty}` : ''}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground whitespace-pre-line">
                      {consultation.details}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 font-code text-[9px] text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    {new Date(consultation.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>

                {(c.adminResponse || c.assignedSpecialist || c.meetingScheduledAt) && (
                  <div className="mt-3 border border-primary/30 bg-primary/10 p-4 space-y-2">
                    <p className="font-code text-[10px] uppercase text-primary font-bold">
                      {clientText(language, 'رد ومتابعة الفريق الهندسي', 'ENGINEERING TEAM RESPONSE')}
                    </p>
                    {c.assignedSpecialist && (
                      <p className="text-xs text-foreground font-semibold">
                        {clientText(language, 'المهندس المسؤول:', 'Assigned Specialist:')}{' '}
                        <span className="text-primary">{c.assignedSpecialist}</span>
                      </p>
                    )}
                    {c.meetingScheduledAt && (
                      <p className="text-xs text-foreground">
                        {clientText(language, 'موعد الجلسة الاستشارية:', 'Scheduled Meeting:')}{' '}
                        <span className="text-accent font-semibold">{new Date(c.meetingScheduledAt).toLocaleString()}</span>
                      </p>
                    )}
                    {c.adminResponse && (
                      <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                        {c.adminResponse}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions row for client */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openEdit(consultation)}
                        className="inline-flex items-center gap-1.5 border border-border/80 bg-secondary/30 px-3 py-1.5 font-code text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Edit3 className="size-3.5" />
                        <span>{clientText(language, 'تعديل الاستشارة', 'Edit Consultation')}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-code text-[11px] text-muted-foreground/80">
                        <Lock className="size-3 text-muted-foreground" />
                        <span>
                          {consultation.status === 'completed'
                            ? clientText(language, 'مكتملة (غير قابلة للتعديل)', 'Completed (Locked)')
                            : consultation.status === 'suspended'
                            ? clientText(language, 'معلّقة مؤقتاً', 'Suspended')
                            : clientText(language, 'قيد الدراسة الهندسية (التعديل مقفل)', 'In Review (Locked)')}
                        </span>
                      </span>
                    )}
                  </div>

                  <div>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setConsultationToDelete(consultation)}
                        className="inline-flex items-center gap-1 border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 font-code text-xs font-medium text-rose-400 transition-colors hover:border-rose-500 hover:bg-rose-500/20"
                        title={clientText(language, 'حذف هذه الاستشارة', 'Delete this consultation')}
                      >
                        <Trash2 className="size-3.5" />
                        <span>{clientText(language, 'حذف', 'Delete')}</span>
                      </button>
                    ) : (
                      <span
                        className="font-code text-[10px] text-muted-foreground"
                        title={clientText(
                          language,
                          'لا يمكن حذف الاستشارة أثناء جدولتها أو تعيين مهندس لها',
                          'Cannot delete consultation during active engineering assignment',
                        )}
                      >
                        {clientText(language, 'الحذف مقفل أثناء التنسيق النشط', 'Delete locked during active assignment')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Edit Consultation Modal */}
      {editingConsultation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col border border-border bg-[#0b1528] shadow-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-border p-5">
              <div>
                <span className="font-code text-[10px] tracking-widest text-primary">
                  EDIT CONSULTATION / {editingConsultation.reference}
                </span>
                <h3 className="mt-1 font-heading text-lg font-bold text-foreground">
                  {clientText(language, 'تعديل تفاصيل الاستشارة', 'Edit Consultation Details')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingConsultation(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editMutation.mutate({
                  id: editingConsultation.id,
                  data: {
                    title: editForm.title.trim(),
                    specialty: editForm.specialty.trim() || undefined,
                    details: editForm.details.trim(),
                  },
                });
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
                  {clientText(language, 'عنوان الاستشارة', 'Consultation Title')}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {clientText(language, 'المجال أو التخصص', 'Specialty / Field')}
                </label>
                <input
                  type="text"
                  value={editForm.specialty}
                  onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                  placeholder={clientText(language, 'ميكانيكا، كهرباء، أتمتة…', 'Mechanical, electrical, automation…')}
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {clientText(language, 'تفاصيل الاستشارة أو الطلب', 'Details / Brief')}
                </label>
                <textarea
                  rows={6}
                  required
                  value={editForm.details}
                  onChange={(e) => setEditForm({ ...editForm, details: e.target.value })}
                  placeholder={clientText(language, 'اشرح المشكلة أو النتيجة المطلوبة…', 'Explain the problem or outcome needed…')}
                  className="mt-1.5 w-full border border-border bg-secondary/40 p-3 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditingConsultation(null)}
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
      {consultationToDelete && (
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
                  {clientText(language, 'تأكيد حذف الاستشارة', 'Confirm Delete Consultation')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {clientText(
                    language,
                    `هل تريد بالتأكيد حذف استشارة "${consultationToDelete.title}" (المرجع: ${consultationToDelete.reference})؟`,
                    `Are you sure you want to delete "${consultationToDelete.title}" (${consultationToDelete.reference})?`,
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
                  setConsultationToDelete(null);
                  setActionError('');
                }}
                disabled={deleteMutation.isPending}
                className="h-9 border border-border px-4 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {clientText(language, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(consultationToDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex h-9 items-center gap-2 border border-rose-500/60 bg-rose-600 px-4 font-code text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>{clientText(language, 'نعم، حذف الاستشارة', 'Yes, Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientConsultationsPage() {
  const { language, isLoading: dashboardLoading, error: dashboardError, refresh } = useClientDashboard();
  const consultationsQuery = useGetClientConsultations();
  const queryClient = useQueryClient();
  const createConsultation = useCreateClientConsultation();
  const [consultationForm, setConsultationForm] = useState({ title: '', details: '' });
  const [specialistForm, setSpecialistForm] = useState<SpecialistForm>(initialSpecialistForm);
  const [formError, setFormError] = useState('');
  const [successReference, setSuccessReference] = useState('');

  const submitConsultation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSuccessReference('');
    try {
      const result = await createConsultation.mutateAsync({ data: { kind: 'consultation', title: consultationForm.title.trim(), details: consultationForm.details.trim() } });
      setSuccessReference(result.reference);
      setConsultationForm({ title: '', details: '' });
      await queryClient.invalidateQueries({ queryKey: getGetClientConsultationsQueryKey() });
    } catch {
      setFormError(clientText(language, 'تعذر إرسال الطلب. حاول مرة أخرى.', 'The request could not be sent. Try again.'));
    }
  };

  const submitSpecialist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSuccessReference('');
    try {
      const result = await createConsultation.mutateAsync({
        data: {
          kind: 'specialist',
          title: specialistForm.title.trim(),
          specialty: specialistForm.specialty.trim() || undefined,
          providerType: specialistForm.providerType,
          preferredProvider: specialistForm.preferredProvider.trim() || undefined,
          details: specialistForm.details.trim(),
        },
      });
      setSuccessReference(result.reference);
      setSpecialistForm(initialSpecialistForm);
      await queryClient.invalidateQueries({ queryKey: getGetClientConsultationsQueryKey() });
    } catch {
      setFormError(clientText(language, 'تعذر إرسال الطلب. حاول مرة أخرى.', 'The request could not be sent. Try again.'));
    }
  };

  const isSubmitting = createConsultation.isPending;
  const showDashboardError = dashboardError && !dashboardLoading;

  return <div className="mx-auto max-w-[1480px]">
    <PageIntro code="CLIENT / 03 — CONSULTATIONS" title={clientText(language, 'الاستشارات والدعم الفني', 'Consultations & technical support')} description={clientText(language, 'أرسل ملخص احتياجك لفريق AJ، أو اطلب ترشيح شخص أو شركة متخصصة لمجال مشروعك.', 'Send AJ a clear brief, or ask for a specialized person or company for your project field.')} action={<Tag>{clientText(language, 'إرسال إلى فريق AJ', 'AJ TEAM INBOX')}</Tag>} />
    {showDashboardError ? <ClientDataError language={language} onRetry={() => void refresh()} /> : <>
      {successReference && <div className="mt-6"><RequestSuccess reference={successReference} language={language} /></div>}
      {formError && <p className="mt-6 border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground" role="alert">{formError}</p>}
      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        <Panel><PanelHeader eyebrow="BRIEF / 01" title={clientText(language, 'استشارة هندسية', 'Engineering consultation')} /><form onSubmit={submitConsultation} className="grid gap-5 p-5 sm:p-7" data-testid="form-client-consultation">
          <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground"><MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />{clientText(language, 'اكتب ملخصاً عن المشكلة أو القرار الهندسي الذي تريد مناقشته مع الفريق.', 'Summarize the engineering problem or decision you want to discuss with the team.')}</div>
          <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'عنوان الاستشارة', 'Consultation title')}</span><input required minLength={2} maxLength={160} value={consultationForm.title} onChange={(event) => setConsultationForm((current) => ({ ...current, title: event.target.value }))} placeholder={clientText(language, 'مثال: مراجعة تصميم خط التعبئة', 'e.g. Review of a filling-line design')} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary" /></label>
          <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'تفاصيل الاستشارة', 'Consultation details')}</span><textarea required minLength={10} maxLength={4000} rows={7} value={consultationForm.details} onChange={(event) => setConsultationForm((current) => ({ ...current, details: event.target.value }))} placeholder={clientText(language, 'اذكر الهدف، المشكلة، القيود، والنتيجة المطلوبة…', 'Share the goal, problem, constraints, and desired outcome…')} className="resize-none border border-input bg-background/60 px-4 py-3 text-sm leading-6 outline-none focus:border-primary" /></label>
          <button disabled={isSubmitting} type="submit" className="inline-flex h-12 items-center justify-center gap-2 bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"><Send className="size-4" />{isSubmitting ? clientText(language, 'جارٍ الإرسال…', 'Sending…') : clientText(language, 'إرسال ملخص الاستشارة', 'Send consultation brief')}</button>
        </form></Panel>
        <Panel><PanelHeader eyebrow="SPECIALIST / 02" title={clientText(language, 'طلب متخصص أو جهة فنية', 'Request a specialist or technical partner')} /><form onSubmit={submitSpecialist} className="grid gap-5 p-5 sm:p-7" data-testid="form-specialist-request">
          <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground"><UserRound className="mt-0.5 size-4 shrink-0 text-primary" />{clientText(language, 'اطلب من الإدارة ترشيح مهندس، شركة، أو دليل فني في مجال محدد.', 'Ask the team to recommend an engineer, company, or technical guide in a specific field.')}</div>
          <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'ما الذي تحتاجه؟', 'What do you need?')}</span><input required minLength={2} maxLength={160} value={specialistForm.title} onChange={(event) => setSpecialistForm((current) => ({ ...current, title: event.target.value }))} placeholder={clientText(language, 'مثال: أحتاج مهندس تحكم كهربائي', 'e.g. I need an electrical controls engineer')} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary" /></label>
          <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'المجال المتخصص', 'Specialized field')}</span><input maxLength={120} value={specialistForm.specialty} onChange={(event) => setSpecialistForm((current) => ({ ...current, specialty: event.target.value }))} placeholder={clientText(language, 'كهرباء، تحكم، أتمتة…', 'Electrical, controls, automation…')} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary" /></label><label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'نوع الجهة', 'Provider type')}</span><select value={specialistForm.providerType} onChange={(event) => setSpecialistForm((current) => ({ ...current, providerType: event.target.value as ClientConsultationInputProviderType }))} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"><option value="person">{providerLabel(language, 'person')}</option><option value="company">{providerLabel(language, 'company')}</option><option value="guide">{providerLabel(language, 'guide')}</option></select></label></div>
          <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'اسم مقترح (اختياري)', 'Preferred person or company (optional)')}</span><input maxLength={160} value={specialistForm.preferredProvider} onChange={(event) => setSpecialistForm((current) => ({ ...current, preferredProvider: event.target.value }))} placeholder={clientText(language, 'إن كان لديك اسم محدد…', 'If you have a specific name…')} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary" /></label>
          <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'تفاصيل الطلب', 'Request details')}</span><textarea required minLength={10} maxLength={4000} rows={5} value={specialistForm.details} onChange={(event) => setSpecialistForm((current) => ({ ...current, details: event.target.value }))} placeholder={clientText(language, 'اشرح نوع المساعدة المطلوبة وموعدها أو قيودها…', 'Explain the support needed, timing, and constraints…')} className="resize-none border border-input bg-background/60 px-4 py-3 text-sm leading-6 outline-none focus:border-primary" /></label>
          <button disabled={isSubmitting} type="submit" className="inline-flex h-12 items-center justify-center gap-2 border border-primary/60 bg-primary/10 px-6 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-60"><Send className="size-4" />{isSubmitting ? clientText(language, 'جارٍ الإرسال…', 'Sending…') : clientText(language, 'إرسال طلب الترشيح', 'Send specialist request')}</button>
        </form></Panel>
      </div>
      <Panel className="mt-6"><PanelHeader eyebrow="REQUEST LOG / PERSISTED" title={clientText(language, 'طلبات الاستشارة السابقة', 'Previous consultation requests')} />{consultationsQuery.isLoading ? <p className="p-6 text-sm text-muted-foreground">{clientText(language, 'جارٍ تحميل الطلبات…', 'Loading requests…')}</p> : consultationsQuery.isError ? <div className="p-6 text-sm text-destructive-foreground">{clientText(language, 'تعذر تحميل سجل الاستشارات.', 'The consultation history could not be loaded.')}</div> : <ConsultationHistory consultations={consultationsQuery.data ?? []} language={language} onUpdated={() => void consultationsQuery.refetch()} />}</Panel>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><Building2 className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'طلبات محفوظة لفريق الإدارة', 'Requests saved for the admin team')}</span></div><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><BookOpen className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'ترشيحات حسب المجال', 'Recommendations by specialty')}</span></div><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><Clock3 className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'تحديث الحالة من الفريق', 'Status updated by the team')}</span></div></div>
    </>}
  </div>;
}

export default ClientConsultationsPage;