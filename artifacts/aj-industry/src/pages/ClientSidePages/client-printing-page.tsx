import { type FormEvent, useState } from 'react';
import { Check, ChevronLeft, CircleCheck, FileDown, Info, Layers3, Package, Printer, Ruler, Send, Timer, Upload, Weight } from 'lucide-react';
import {
  clientText,
  PageIntro,
  Panel,
  PanelHeader,
  ProgressBar,
  Tag,
  useClientDashboard,
} from './client-dashboard-shell';

type PrintForm = {
  project: string;
  material: string;
  finish: string;
  quantity: string;
  delivery: string;
  notes: string;
};

const initialForm: PrintForm = {
  project: '',
  material: 'PETG-CF',
  finish: 'functional',
  quantity: '1',
  delivery: 'standard',
  notes: '',
};

export function ClientPrintingPage() {
  const { language } = useClientDashboard();
  const [form, setForm] = useState<PrintForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState('');
  const [downloaded, setDownloaded] = useState('');

  const update = (key: keyof PrintForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageIntro
        code="PRINT LAB / 02 — PROJECT AJ-3DP-042"
        title={clientText(language, 'الطباعة ثلاثية الأبعاد', '3D printing lab')}
        description={clientText(language, 'تابع دورة الطباعة الحالية أو ارفع طلباً جديداً بمواصفات يمكن لفريقنا تنفيذها مباشرة.', 'Track the current print cycle or submit a new request with specifications our team can act on directly.')}
        action={<Tag tone="amber">{clientText(language, 'دورة طباعة نشطة', 'ACTIVE PRINT CYCLE')}</Tag>}
      />

      <div className="mt-7 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <Panel>
          <PanelHeader eyebrow="ACTIVE BUILD / AJ-3DP-042" title={clientText(language, 'حامل مضخة التبريد', 'Cooling Pump Bracket')} action={<Tag tone="green">{clientText(language, 'قيد التصنيع', 'IN PRODUCTION')}</Tag>} />
          <div className="p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="font-code text-[9px] tracking-[.16em] text-muted-foreground">FUNCTIONAL PROTOTYPE / REV 03</p><h2 className="mt-3 font-display text-2xl font-bold">{clientText(language, 'النموذج الوظيفي — نسخة مراجعة', 'Functional prototype — review build')}</h2></div><div className="text-start sm:text-end"><p className="font-code text-3xl text-primary">68%</p><p className="mt-1 text-xs text-muted-foreground">{clientText(language, 'اكتمل', 'COMPLETE')}</p></div></div>
            <div className="mt-8"><ProgressBar value={68} /></div>
            <div className="mt-8 grid gap-0 sm:grid-cols-5">
              {[
                { code: '01', label: clientText(language, 'استلام', 'Received'), state: 'done' },
                { code: '02', label: clientText(language, 'مراجعة CAD', 'CAD review'), state: 'done' },
                { code: '03', label: clientText(language, 'تحضير الطباعة', 'Print prep'), state: 'done' },
                { code: '04', label: clientText(language, 'دورة الطباعة', 'Print run'), state: 'current' },
                { code: '05', label: clientText(language, 'فحص وتسليم', 'QA & delivery'), state: 'next' },
              ].map((step, index) => <div key={step.code} className="relative flex gap-3 border-s-0 border-t border-border py-4 sm:block sm:border-s-0 sm:border-t-0 sm:py-0"><div className={`relative z-10 grid size-8 shrink-0 place-items-center border text-[10px] font-bold sm:mb-3 ${step.state === 'done' ? 'border-primary bg-primary text-primary-foreground' : step.state === 'current' ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-background text-muted-foreground'}`}>{step.state === 'done' ? <Check className="size-3.5" /> : step.code}</div><div className={`absolute start-8 top-4 h-px w-[calc(100%-1rem)] sm:start-8 sm:top-4 sm:block ${index < 4 ? 'bg-border' : 'hidden'}`} /><div><p className={`text-xs font-semibold ${step.state === 'next' ? 'text-muted-foreground' : ''}`}>{step.label}</p><p className="mt-1 font-code text-[9px] text-muted-foreground">{step.state === 'current' ? clientText(language, 'جارٍ الآن', 'IN PROGRESS') : step.state === 'done' ? clientText(language, 'مكتمل', 'COMPLETE') : clientText(language, 'قادم', 'NEXT')}</p></div></div>)}
            </div>
            <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
              {[{ icon: Layers3, label: clientText(language, 'المادة', 'MATERIAL'), value: 'PETG-CF' }, { icon: Ruler, label: clientText(language, 'الدقة', 'LAYER HEIGHT'), value: '0.20 mm' }, { icon: Weight, label: clientText(language, 'الكمية', 'QUANTITY'), value: '01 / 184 g' }].map((item) => <div key={item.label} className="flex items-center gap-3 border border-border/70 bg-secondary/25 p-4"><item.icon className="size-4 text-primary" /><div><p className="font-code text-[9px] text-muted-foreground">{item.label}</p><p className="mt-1 text-sm font-semibold">{item.value}</p></div></div>)}
            </div>
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Panel><PanelHeader eyebrow="DELIVERY / TARGET" title={clientText(language, 'موعد التسليم المتوقع', 'Estimated delivery')} /><div className="p-5 sm:p-6"><div className="flex items-end justify-between"><p className="font-code text-4xl text-primary">18</p><p className="pb-1 font-code text-xs text-muted-foreground">JUN / 2025</p></div><p className="mt-4 text-sm font-semibold">{clientText(language, 'فحص جودة وتسليم محلي', 'Quality check & local delivery')}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">{clientText(language, 'سنرسل صور الفحص وملاحظات الملاءمة قبل التسليم.', 'We will share inspection photos and fit notes before delivery.')}</p></div></Panel>
          <Panel><PanelHeader eyebrow="FILE PACK / DOWNLOADS" title={clientText(language, 'ملفات المشروع', 'Project files')} /><div className="grid gap-2 p-5 sm:p-6"><button type="button" onClick={() => setDownloaded('AJ-3DP-042_REV03.step')} className="flex items-center gap-3 border border-border p-3 text-start text-xs transition-colors hover:border-primary/60"><FileDown className="size-4 text-primary" /><span className="flex-1"><span className="block font-semibold">AJ-3DP-042_REV03.step</span><span className="mt-1 block font-code text-[9px] text-muted-foreground">8.4 MB / 12 JUN</span></span><ChevronLeft className="size-3.5 text-muted-foreground rtl:rotate-180" /></button><button type="button" onClick={() => setDownloaded('MATERIAL_TEST_REPORT.pdf')} className="flex items-center gap-3 border border-border p-3 text-start text-xs transition-colors hover:border-primary/60"><FileDown className="size-4 text-primary" /><span className="flex-1"><span className="block font-semibold">MATERIAL_TEST_REPORT.pdf</span><span className="mt-1 block font-code text-[9px] text-muted-foreground">1.2 MB / 11 JUN</span></span><ChevronLeft className="size-3.5 text-muted-foreground rtl:rotate-180" /></button>{downloaded && <p className="pt-1 font-code text-[9px] text-accent">{clientText(language, `تم تجهيز ${downloaded} للتحميل`, `${downloaded} ready for download`)}</p>}</div></Panel>
        </div>
      </div>

      <div className="mt-10 flex items-end justify-between gap-4"><div><p className="font-code text-[9px] tracking-[.2em] text-primary">NEW REQUEST / 02</p><h2 className="mt-3 font-display text-2xl font-bold">{clientText(language, 'احجز دورة طباعة جديدة', 'Book a new print run')}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{clientText(language, 'أرسل التفاصيل الأساسية، وسيراجعها مهندس من فريق AJ قبل تأكيد السعر والموعد.', 'Share the core details. An AJ engineer will review them before confirming price and timing.')}</p></div><span className="hidden font-code text-[10px] text-muted-foreground sm:block">FORM / QUOTE REQUEST</span></div>
      <Panel className="mt-5">
        {submitted ? (
          <div className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8" data-testid="status-print-request-success"><span className="grid size-12 shrink-0 place-items-center border border-accent/50 bg-accent/10 text-accent"><CircleCheck className="size-6" /></span><div className="flex-1"><Tag tone="green">{clientText(language, 'تم استلام الطلب', 'REQUEST RECEIVED')}</Tag><h3 className="mt-4 font-display text-2xl font-bold">{clientText(language, 'سنعود إليك بتأكيد فني قريباً.', 'We will return with a technical confirmation shortly.')}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{clientText(language, 'رقم الطلب AJ-RQ-184. وقت المراجعة المتوقع أقل من 04 ساعات عمل.', 'Request AJ-RQ-184. Expected review time is under 04 working hours.')}</p></div><button type="button" onClick={() => { setSubmitted(false); setForm(initialForm); setFileName(''); }} className="text-sm font-semibold text-primary hover:underline">{clientText(language, 'طلب آخر', 'New request')}</button></div>
        ) : (
          <form onSubmit={submit} className="grid gap-6 p-5 sm:p-7" data-testid="form-print-request">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'اسم المشروع', 'Project name')}</span><input required value={form.project} onChange={(event) => update('project', event.target.value)} placeholder={clientText(language, 'مثال: غطاء لوحة التحكم', 'e.g. control panel cover')} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary" /></label>
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'الكمية المطلوبة', 'Quantity')}</span><input required type="number" min="1" max="1000" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary" /></label>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'المادة', 'Material')}</span><select value={form.material} onChange={(event) => update('material', event.target.value)} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"><option>PETG-CF</option><option>PLA Pro</option><option>ABS</option><option>TPU 95A</option></select></label>
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'نوع التشطيب', 'Finish')}</span><select value={form.finish} onChange={(event) => update('finish', event.target.value)} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"><option value="functional">{clientText(language, 'وظيفي', 'Functional')}</option><option value="visual">{clientText(language, 'عرض بصري', 'Visual prototype')}</option><option value="production">{clientText(language, 'قريب من الإنتاج', 'Production-ready')}</option></select></label>
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'الجدول الزمني', 'Timeline')}</span><select value={form.delivery} onChange={(event) => update('delivery', event.target.value)} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"><option value="standard">{clientText(language, 'قياسي — 5 إلى 7 أيام', 'Standard — 5 to 7 days')}</option><option value="priority">{clientText(language, 'أولوية — 2 إلى 3 أيام', 'Priority — 2 to 3 days')}</option></select></label>
            </div>
            <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
              <label className="group flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-secondary/20 px-4 text-center transition-colors hover:border-primary/60"><Upload className="size-5 text-primary" /><span className="text-xs font-semibold">{fileName || clientText(language, 'ارفع ملف STL أو STEP', 'Upload STL or STEP file')}</span><span className="font-code text-[9px] text-muted-foreground">MAX 25 MB</span><input type="file" accept=".stl,.step,.stp" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name || '')} /></label>
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'ملاحظات هندسية', 'Engineering notes')}</span><textarea rows={5} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder={clientText(language, 'التفاوتات، نقاط التثبيت، أو أي متطلبات خاصة...', 'Tolerances, mounting points, or special requirements...')} className="resize-none border border-input bg-background/60 px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground/50 focus:border-primary" /></label>
            </div>
            <div className="flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center"><p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" />{clientText(language, 'لا يتم تأكيد السعر حتى يراجع المهندس الملف والمواصفات.', 'Price is not confirmed until an engineer reviews the file and specifications.')}</p><button type="submit" className="inline-flex h-12 items-center justify-center gap-2 bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"><Send className="size-4" />{clientText(language, 'إرسال طلب التسعير', 'Send quote request')}</button></div>
          </form>
        )}
      </Panel>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><Printer className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'طباعة FDM دقيقة', 'Precision FDM printing')}</span></div><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><Timer className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'مراجعة خلال 04 ساعات', 'Review within 04 hours')}</span></div><div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><Package className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{clientText(language, 'تغليف وتسليم محمي', 'Protected packing & delivery')}</span></div></div>
    </div>
  );
}

export default ClientPrintingPage;