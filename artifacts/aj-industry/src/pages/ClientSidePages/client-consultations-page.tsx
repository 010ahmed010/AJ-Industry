import { type FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetClientConsultationsQueryKey,
  useCreateClientConsultation,
  useGetClientConsultations,
  type ClientConsultation,
  type ClientConsultationInputProviderType,
} from '@workspace/api-client-react';
import { BookOpen, Building2, CircleCheck, Clock3, MessageCircle, Send, UserRound } from 'lucide-react';
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

function ConsultationHistory({ consultations, language }: { consultations: ClientConsultation[]; language: 'ar' | 'en' }) {
  if (consultations.length === 0) {
    return <div className="p-6 text-sm leading-7 text-muted-foreground">{clientText(language, 'لا توجد طلبات استشارة بعد. أرسل طلبك الأول من الأقسام أعلاه.', 'No consultation requests yet. Send your first request from the sections above.')}</div>;
  }
  return <div className="divide-y divide-border/70">
    {consultations.map((consultation) => <div key={consultation.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><Tag tone={consultation.status === 'completed' ? 'green' : consultation.status === 'submitted' ? 'amber' : 'blue'}>{statusLabel(language, consultation)}</Tag><span className="font-code text-[9px] text-muted-foreground">{consultation.reference}</span></div>
        <p className="mt-3 font-display text-lg font-bold">{consultation.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{kindLabel(language, consultation.kind)}{consultation.specialty ? ` · ${consultation.specialty}` : ''}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{consultation.details}</p>
      </div>
      <span className="flex shrink-0 items-center gap-2 font-code text-[9px] text-muted-foreground"><Clock3 className="size-3.5" />{new Date(consultation.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
    </div>)}
  </div>;
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
      <Panel className="mt-6"><PanelHeader eyebrow="REQUEST LOG / PERSISTED" title={clientText(language, 'طلبات الاستشارة السابقة', 'Previous consultation requests')} />{consultationsQuery.isLoading ? <p className="p-6 text-sm text-muted-foreground">{clientText(language, 'جارٍ تحميل الطلبات…', 'Loading requests…')}</p> : consultationsQuery.isError ? <div className="p-6 text-sm text-destructive-foreground">{clientText(language, 'تعذر تحميل سجل الاستشارات.', 'The consultation history could not be loaded.')}</div> : <ConsultationHistory consultations={consultationsQuery.data ?? []} language={language} />}</Panel>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><Building2 className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'طلبات محفوظة لفريق الإدارة', 'Requests saved for the admin team')}</span></div><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><BookOpen className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'ترشيحات حسب المجال', 'Recommendations by specialty')}</span></div><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><Clock3 className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'تحديث الحالة من الفريق', 'Status updated by the team')}</span></div></div>
    </>}
  </div>;
}

export default ClientConsultationsPage;