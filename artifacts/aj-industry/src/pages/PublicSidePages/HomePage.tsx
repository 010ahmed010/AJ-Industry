import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowUpRight, Box, Check, CircleAlert, Gauge, Menu, MoveUpRight, Send, Sparkles, X, Zap } from 'lucide-react';
import {
  useCreateInquiry,
  useCreatePrintEstimate,
  useGetHomeContent,
  useGetService,
  useListMaterials,
  useListServices,
} from '@workspace/api-client-react';
import type { HomeContent, Material, PrintEstimate, ServiceDetail, ServiceSummary } from '@workspace/api-client-react';

type Language = 'ar' | 'en';

const ar = (language: Language) => language === 'ar';

function display(language: Language, arabic: string, english: string): string;
function display(language: Language, arabic: React.ReactNode, english: React.ReactNode): React.ReactNode;
function display(language: Language, arabic: React.ReactNode, english: React.ReactNode): React.ReactNode {
  return ar(language) ? arabic : english;
}

const whyWeImages = [
  { src: '/media/why-we-1.jpeg', altAr: 'مهندس يراجع نموذجاً هندسياً ثلاثي الأبعاد', altEn: 'Engineer reviewing a 3D engineering model' },
  { src: '/media/why-we-2.png', altAr: 'آلة تصنيع CNC داخل منشأة صناعية', altEn: 'CNC machine inside an industrial facility' },
  { src: '/media/why-we-3.jpeg', altAr: 'تصنيع دقيق لقطع ميكانيكية', altEn: 'Precision manufacturing of mechanical parts' },
];

function LoadingBlock({ label = 'جاري تحميل البيانات' }: { label?: string }) {
  return <div className="grid gap-3" data-testid="status-loading">
    <div className="h-5 w-32 animate-pulse rounded bg-secondary" />
    <div className="h-24 animate-pulse rounded-xl bg-secondary" />
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>;
}

function QueryNotice({ retry, label }: { retry: () => void; label: string }) {
  return <div className="border border-destructive/35 bg-destructive/10 p-5 rounded-xl" data-testid="status-error">
    <div className="flex items-start gap-3">
      <CircleAlert className="mt-0.5 size-5 text-destructive" />
      <div className="flex-1">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">تعذر الوصول إلى بيانات المنصة. حاول مرة أخرى.</p>
      </div>
      <button type="button" onClick={retry} className="text-sm font-semibold text-primary underline underline-offset-4" data-testid="button-retry">إعادة المحاولة</button>
    </div>
  </div>;
}

function Header() {
  const [language, setLanguage] = useState<Language>('ar');
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const navigation = [
    { href: '/', ar: 'الرئيسية', en: 'Home' },
    { href: '/#services', ar: 'الخدمات', en: 'Services' },
    { href: '/print-3d', ar: 'الطباعة ثلاثية الأبعاد', en: '3D Printing' },
    { href: '/materials', ar: 'المواد', en: 'Materials' },
  ];

  return <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl" data-testid="site-header">
    <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link href="/" onClick={close} className="group flex items-center gap-3" data-testid="link-brand">
        <span className="relative grid size-10 place-items-center border border-primary/50 bg-primary/10 text-primary">
          <span className="absolute inset-1 border border-primary/30" />
          <span className="font-code text-sm font-bold">AJ</span>
        </span>
        <span className="leading-none">
          <span className="block font-display text-lg font-bold tracking-tight">AJ—INDUSTRY</span>
          <span className="mt-1 block font-code text-[9px] tracking-[.24em] text-muted-foreground">ENGINEERING STUDIO</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
        {navigation.map((item) => <Link key={item.href} href={item.href} className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid={`link-nav-${item.en.toLowerCase().replaceAll(' ', '-')}`}>{display(language, item.ar, item.en)}</Link>)}
      </nav>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setLanguage((current) => current === 'ar' ? 'en' : 'ar')} className="group flex h-9 items-center gap-2 border border-border bg-secondary/50 px-3 text-xs font-semibold transition-colors hover:border-primary/60 hover:text-primary" data-testid="button-language-toggle" aria-label={display(language, 'تبديل اللغة إلى الإنجليزية', 'Switch language to Arabic')}>
          <span className="font-code text-[10px] text-primary">{language === 'ar' ? 'AR' : 'EN'}</span>
          <span className="hidden text-muted-foreground sm:inline">{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
        <Link href="/#contact" className="hidden h-9 items-center gap-2 bg-primary px-4 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:flex" data-testid="link-header-contact">
          {display(language, 'ابدأ مشروعك', 'Start a project')} <ArrowUpRight className="size-3.5" />
        </Link>
        <button type="button" onClick={() => setOpen((value) => !value)} className="grid size-9 place-items-center border border-border text-muted-foreground md:hidden" data-testid="button-mobile-menu" aria-expanded={open}>
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
    </div>
    {open && <nav className="border-t border-border bg-background px-5 py-3 md:hidden" aria-label="Mobile navigation">
      {navigation.map((item) => <Link key={item.href} href={item.href} onClick={close} className="block border-b border-border/60 py-3 text-sm text-muted-foreground last:border-0" data-testid={`link-mobile-${item.en.toLowerCase().replaceAll(' ', '-')}`}>{display(language, item.ar, item.en)}</Link>)}
      <Link href="/#contact" onClick={close} className="mt-3 flex items-center justify-center gap-2 bg-primary py-3 text-sm font-bold text-primary-foreground" data-testid="link-mobile-contact">{display(language, 'اطلب استشارة', 'Request a consultation')} <ArrowUpRight className="size-4" /></Link>
    </nav>}
  </header>;
}

function PageFooter() {
  const language: Language = 'ar';
  return <footer className="relative overflow-hidden border-t border-border bg-[#071126] py-14" data-testid="site-footer">
    <img src="/media/footer-reference.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.12]" />
    <div className="relative mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
      <div>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center border border-primary/50 bg-primary/10 font-code text-sm font-bold text-primary">AJ</span>
          <span className="font-display text-xl font-bold">AJ—INDUSTRY</span>
        </div>
        <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">{display(language, 'نحوّل التحديات الصناعية إلى آلات أدق، أسرع، وأسهل في الصيانة.', 'We turn industrial challenges into machines that are more precise, faster, and easier to maintain.')}</p>
        <div className="mt-6 flex gap-2">
          {['in', 'X', '◌'].map((item) => <button type="button" key={item} className="grid size-8 place-items-center border border-border bg-secondary/70 font-code text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary" data-testid={`button-social-${item}`}>{item}</button>)}
        </div>
      </div>
      <div>
        <p className="font-code text-[10px] tracking-[.2em] text-primary">EXPLORE</p>
        <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
          <Link href="/#services" className="transition-colors hover:text-primary" data-testid="link-footer-services">{display(language, 'الخدمات الهندسية', 'Engineering services')}</Link>
          <Link href="/print-3d" className="transition-colors hover:text-primary" data-testid="link-footer-print">{display(language, 'الطباعة ثلاثية الأبعاد', '3D printing')}</Link>
          <Link href="/materials" className="transition-colors hover:text-primary" data-testid="link-footer-materials">{display(language, 'دليل المواد', 'Material guide')}</Link>
        </div>
      </div>
      <div>
        <p className="font-code text-[10px] tracking-[.2em] text-primary">CONTACT</p>
        <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
          <a href="mailto:hello@aj-industry.com" className="transition-colors hover:text-primary" data-testid="link-footer-email">hello@aj-industry.com</a>
          <a href="tel:+966500000000" className="transition-colors hover:text-primary" data-testid="link-footer-phone">+966 50 000 0000</a>
          <span>{display(language, 'الرياض، المملكة العربية السعودية', 'Riyadh, Saudi Arabia')}</span>
        </div>
      </div>
    </div>
    <div className="relative mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-border/70 px-5 pt-5 font-code text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <span>© 2025 AJ—INDUSTRY / ALL SYSTEMS NOMINAL</span><span>{display(language, 'الخصوصية والشروط', 'Privacy & terms')}</span>
    </div>
  </footer>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="noise min-h-[100dvh] bg-background"><Header />{children}<PageFooter /></div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex items-center gap-3 font-code text-[10px] font-medium tracking-[.24em] text-primary"><span className="h-px w-8 bg-primary" />{children}</div>;
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="max-w-2xl"><Eyebrow>{eyebrow}</Eyebrow><h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">{title}</h2>{body && <p className="mt-5 text-base leading-8 text-muted-foreground">{body}</p>}</div>;
}

function ServiceCard({ service, index, language }: { service: ServiceSummary; index: number; language: Language }) {
  return <Link href={`/services/${service.slug}`} className="group relative overflow-hidden border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/65 hover:shadow-lg" style={{ borderTopColor: service.accent || undefined }} data-testid={`card-service-${service.slug}`}>
    <div className="flex items-start justify-between"><span className="font-code text-xs text-primary">0{index + 1} / {service.category}</span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" /></div>
    <div className="mt-12"><h3 className="font-display text-2xl font-bold">{display(language, service.titleAr, service.titleEn)}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{display(language, service.descriptionAr, service.descriptionEn)}</p></div>
    <div className="mt-7 flex items-center justify-between border-t border-border pt-4 font-code text-[10px] text-muted-foreground"><span>{service.duration}</span><span className="text-primary">{display(language, 'اكتشف الخدمة', 'Explore service')}</span></div>
  </Link>;
}

function InquiryForm({ serviceSlug }: { serviceSlug?: string }) {
  const { language } = { language: 'ar' as Language };
  const inquiry = useCreateInquiry();
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [success, setSuccess] = useState<{ reference: string; message: string } | null>(null);
  const [error, setError] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError(false);
    inquiry.mutate({ data: { ...form, company: form.company || undefined, serviceSlug } }, {
      onSuccess: (receipt) => { setSuccess({ reference: receipt.reference, message: display(language, receipt.messageAr, receipt.messageEn) }); setForm({ name: '', email: '', company: '', message: '' }); },
      onError: () => setError(true),
    });
  };

  if (success) return <div className="border border-accent/40 bg-accent/10 p-8" data-testid="status-inquiry-success"><div className="grid size-12 place-items-center bg-accent text-accent-foreground"><Check className="size-6" /></div><h3 className="mt-6 font-display text-2xl font-bold">{display(language, 'وصلتنا رسالتك.', 'Message received.')}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground" data-testid="text-inquiry-message">{success.message}</p><p className="mt-5 font-code text-xs text-accent" data-testid="text-inquiry-reference">REF / {success.reference}</p><button type="button" onClick={() => setSuccess(null)} className="mt-7 text-sm font-semibold text-primary underline underline-offset-4" data-testid="button-new-inquiry">{display(language, 'إرسال رسالة أخرى', 'Send another message')}</button></div>;

  return <form onSubmit={submit} className="grid gap-4" data-testid="form-inquiry">
    {error && <div className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-inquiry-error">{display(language, 'حدث خطأ. تحقق من البيانات وحاول مجدداً.', 'Something went wrong. Check your details and try again.')}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold"><span>{display(language, 'الاسم الكامل', 'Full name')}</span><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none transition-colors focus:border-primary" data-testid="input-inquiry-name" /></label>
      <label className="grid gap-2 text-sm font-semibold"><span>{display(language, 'البريد الإلكتروني', 'Email')}</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none transition-colors focus:border-primary" data-testid="input-inquiry-email" /></label>
    </div>
    <label className="grid gap-2 text-sm font-semibold"><span>{display(language, 'الشركة (اختياري)', 'Company (optional)')}</span><input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none transition-colors focus:border-primary" data-testid="input-inquiry-company" /></label>
    <label className="grid gap-2 text-sm font-semibold"><span>{display(language, 'ما الذي تريد بناءه؟', 'What are you looking to build?')}</span><textarea required minLength={10} rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="resize-none border border-input bg-background/60 px-4 py-3 text-sm leading-7 outline-none transition-colors focus:border-primary" data-testid="input-inquiry-message" /></label>
    <button type="submit" disabled={inquiry.isPending} className="mt-2 flex h-12 items-center justify-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60" data-testid="button-submit-inquiry">{inquiry.isPending ? display(language, 'جاري الإرسال...', 'Sending...') : display(language, 'إرسال طلب الاستشارة', 'Send consultation request')} <Send className="size-4" /></button>
  </form>;
}

export function HomePage({ language = 'ar' }: { language?: Language }) {
  const home = useGetHomeContent();
  const services = useListServices();
  const content = home.data as HomeContent | undefined;
  const serviceList = services.data as ServiceSummary[] | undefined;
  const stats = content?.stats ?? [];
  const stages = content?.designStages ?? [];
  const differentiators = content?.differentiators ?? [];
  const [whyImageIndex, setWhyImageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setWhyImageIndex((current) => (current + 1) % whyWeImages.length), 4500);
    return () => window.clearInterval(interval);
  }, []);

  return <Shell>
    <main>
      <section className="relative isolate min-h-[110svh] overflow-hidden border-b border-border pt-[74px]" data-testid="section-hero">
        <video className="absolute inset-0 -z-20 h-full w-full bg-[#071126] object-cover opacity-50" autoPlay muted loop playsInline poster="/media/hero-section-poster.jpg" aria-hidden="true">
          <source src="/media/hero-section.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(224_52%_6%/.78)_0%,hsl(224_52%_6%/.86)_48%,hsl(224_52%_6%/.78)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_52%_45%,hsl(211_100%_61%/.15),transparent_42%)]" />
        <div className="absolute inset-0 -z-10 grid-tech opacity-20" />
        <div className="scanline pointer-events-none absolute left-[20%] top-0 -z-10 h-1/3 w-px bg-primary/40" />
        <div dir={ar(language) ? 'rtl' : 'ltr'} className="mx-auto flex min-h-[calc(110svh-74px)] max-w-7xl items-center justify-between gap-10 px-5 pb-28 pt-20 lg:px-8">
          <div className={`max-w-3xl ${ar(language) ? 'text-right' : 'text-left'}`}>
            <div className="animate-rise flex items-center gap-3 font-code text-[10px] tracking-[.16em] text-primary"><span className="size-2 bg-primary pulse-line" /> FIELD NOTE / 05 / ENGINEERING INTELLIGENCE</div>
            <h1 className="animate-rise delay-1 mt-6 font-display text-5xl font-bold leading-[1.04] tracking-[-.045em] text-balance sm:text-7xl lg:text-[76px]">
              {ar(language) ? <>نحوّل <span className="text-primary">التعقيد الصناعي</span><br />إلى قرار قابل للتنفيذ.</> : <>Turn industrial<br /><span className="text-primary">complexity</span> into motion.</>}
            </h1>
            <p className="animate-rise delay-2 mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">{display(language, 'من ملفات التصنيع الجاهزة إلى الآلة المناسبة، نصنع مساراً واضحاً للمصانع وملاك الآلات والمشترين.', 'From manufacturing-ready files to the right machine, we make the path clear for factories, owners, and buyers.')}</p>
            <div className="animate-rise delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/#contact" className="flex h-12 items-center justify-center gap-3 bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-1" data-testid="link-hero-contact">{display(language, 'ابدأ محادثة هندسية', 'Start an engineering brief')} <ArrowUpRight className="size-4" /></Link>
              <Link href="/#services" className="flex h-12 items-center justify-center gap-3 border border-border bg-background/30 px-6 text-sm font-bold transition-colors hover:border-primary hover:text-primary" data-testid="link-hero-services">{display(language, 'تصفح القدرات المعتمدة', 'Browse approved machinery')} <ArrowLeft className="size-4" /></Link>
            </div>
          </div>
          <div className="hidden w-64 shrink-0 border border-border/80 bg-background/65 p-5 backdrop-blur-sm lg:block">
            <div className="flex items-center justify-between font-code text-[9px] text-muted-foreground"><span>SYSTEM / ONLINE</span><span>AJ—04</span></div>
            <div className="mt-7 border-t border-border/70 pt-4">
              <p className="font-code text-[9px] uppercase tracking-[.14em] text-muted-foreground">CURRENT FOCUS</p>
              <p className="mt-3 font-display text-xl font-bold leading-tight">Production<br />readiness</p>
            </div>
            <div className="mt-7 flex items-center justify-between font-code text-[9px]"><span className="text-muted-foreground">Feasibility</span><span className="text-accent">READY</span></div>
            <div className="mt-2 h-px bg-border"><div className="h-px w-4/5 bg-primary" /></div>
            <div className="mt-3 flex items-center justify-between font-code text-[9px] text-muted-foreground"><span>Response time</span><span>24–48 H</span></div>
          </div>
        </div>
        <div dir={ar(language) ? 'rtl' : 'ltr'} className="absolute inset-x-0 bottom-0 border-t border-border/80 bg-[#071126]/90 backdrop-blur-sm" data-testid="section-stats">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border/80 sm:grid-cols-4 lg:px-8">
            {(stats.length ? stats : [{ value: '06', labelAr: 'خدمات هندسية', labelEn: 'Engineering services' }, { value: '18', labelAr: 'سنة خبرة', labelEn: 'Years of experience' }, { value: '04', labelAr: 'مراحل واضحة', labelEn: 'Clear stages' }, { value: '24h', labelAr: 'زمن الرد الأولي', labelEn: 'First response' }]).map((stat, index) => <div key={index} className="flex min-h-[72px] items-center justify-between gap-3 border-b border-border/70 px-5 py-4 last:border-b-0 sm:block sm:border-b-0 sm:px-7 sm:py-5" data-testid={`stat-home-${index}`}><span className="font-code text-2xl text-primary sm:block sm:text-3xl">{stat.value}</span><span className="text-xs text-muted-foreground sm:mt-2 sm:block">{display(language, stat.labelAr, stat.labelEn)}</span></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8" data-testid="section-why-we">
        <div dir={ar(language) ? 'rtl' : 'ltr'} className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="WHY WE / 01"
              title={display(language, 'لا نبيع ساعات. نبني نتائج قابلة للقياس.', 'We do not sell hours. We build measurable outcomes.')}
              body={display(language, 'نحن موجودون لنحوّل التعقيد الصناعي إلى قرارات هندسية واضحة، من الفكرة والـ CAD إلى ملفات التصنيع والقطعة الوظيفية.', 'We exist to turn industrial complexity into clear engineering decisions, from the first idea and CAD file to manufacturing-ready outputs and functional parts.')}
            />
            <div className="mt-10 grid gap-3">
              {(differentiators.length ? differentiators : [
                { titleAr: 'حل هندسي متكامل', titleEn: 'One engineering partner', descriptionAr: 'من الفكرة والـ CAD إلى ملفات التصنيع والقطعة الوظيفية.', descriptionEn: 'From the idea and CAD to manufacturing files and functional parts.' },
                { titleAr: 'تقليل المخاطر قبل الإنتاج', titleEn: 'Less risk before production', descriptionAr: 'اختبر الحركة والملاءمة والخامة قبل الالتزام بتصنيع مكلف.', descriptionEn: 'Validate motion, fit, and materials before costly production.' },
                { titleAr: 'وضوح تقني يمكن الوثوق به', titleEn: 'Technical clarity', descriptionAr: 'مخرجات محددة وتفاوتات موثقة وتواصل مباشر مع المهندس.', descriptionEn: 'Defined outputs, documented tolerances, and direct engineering communication.' },
              ]).map((item, index) => <div key={index} className="flex gap-4 border-t border-border py-4" data-testid={`card-why-we-${index}`}>
                <span className="font-code text-xs text-primary">0{index + 1}</span>
                <div><h3 className="font-semibold">{display(language, item.titleAr, item.titleEn)}</h3><p className="mt-1 text-sm leading-7 text-muted-foreground">{display(language, item.descriptionAr, item.descriptionEn)}</p></div>
              </div>)}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden border border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
              <img src={whyWeImages[whyImageIndex].src} alt={display(language, whyWeImages[whyImageIndex].altAr, whyWeImages[whyImageIndex].altEn)} className="h-[520px] w-full object-cover" data-testid="img-why-we-feature" />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 border border-border bg-background/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-code text-[10px] tracking-[.2em] text-primary">PROCESS / 02</p>
                  <p className="mt-3 font-display text-xl font-bold">{display(language, 'تكنيك متماسك من الطلب إلى التسليم.', 'A consistent path from request to delivery.')}</p>
                </div>
                <div className="grid size-11 place-items-center border border-primary/40 bg-primary/10 text-primary"><MoveUpRight className="size-4" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="border-t border-border bg-card/40 py-24" data-testid="section-services">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div dir={ar(language) ? 'rtl' : 'ltr'} className="flex items-end justify-between gap-6">
            <SectionHeading eyebrow="SERVICES / 03" title={display(language, 'خدمات مصممة للحل لا للحجم فقط.', 'Services built for solving, not just volume.')} body={display(language, 'من التصميم الأولي إلى التشغيل والتوثيق، نقود المشروع عبر كل نقطة قرار.', 'From first concept to operation and documentation, we guide the project through every decision point.')} />
            <Link href="/#contact" className="hidden items-center gap-2 text-sm font-bold text-primary sm:flex" data-testid="link-services-request">{display(language, 'اطلب تصميماً مخصصاً', 'Request a custom design')} <ArrowUpRight className="size-4" /></Link>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {(serviceList && serviceList.length ? serviceList : []).map((service, index) => <ServiceCard key={service.slug} service={service} index={index} language={language} />)}
            {!serviceList || serviceList.length === 0 ? <LoadingBlock label="جاري تحميل الخدمات" /> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8" data-testid="section-process">
        <div dir={ar(language) ? 'rtl' : 'ltr'} className="grid gap-14 lg:grid-cols-[.8fr_1.5fr]">
          <div>
            <SectionHeading eyebrow="PROCESS / 03" title={display(language, 'كل خطوة لها أثر.', 'Every step has a consequence.')} body={display(language, 'عملية واضحة، قابلة للمراجعة، مصممة لتضع المعرفة الصحيحة في يد القرار الصحيح.', 'A clear, reviewable process designed to put the right knowledge in the right decision.')} />
            <img src="/media/design-stages-reference.png" alt={display(language, 'مراحل التصميم الهندسي', 'Engineering design stages')} className="mt-10 w-full border border-border opacity-80" data-testid="img-design-stages" />
          </div>
          <div className="grid gap-3 self-end sm:grid-cols-2">
            {(stages.length ? stages : Array.from({ length: 6 }, (_, index) => ({ number: index + 1, titleAr: ['جلسة الإحاطة', 'رسم المفهوم', 'النمذجة ثلاثية الأبعاد', 'المحاكاة', 'الرسومات التنفيذية', 'المراجعة والتسليم'][index], titleEn: ['Brief & meeting', 'Concept sketch', '3D modelling', 'Simulation', 'Technical drawings', 'Review & delivery'][index], descriptionAr: 'نحوّل المعطيات إلى قرار هندسي واضح.', descriptionEn: 'Turning inputs into a clear engineering decision.' }))).map((stage, index) => <div key={index} className="group flex gap-4 border border-border bg-card p-5 transition-colors hover:border-primary/60" data-testid={`card-stage-${index}`}><span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/50 bg-primary/10 font-code text-xs text-primary">{String(stage.number).padStart(2, '0')}</span><div><h3 className="font-semibold">{display(language, stage.titleAr, stage.titleEn)}</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">{display(language, stage.descriptionAr, stage.descriptionEn)}</p></div></div>)}
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-border bg-card/50 py-24" data-testid="section-contact">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
          <div>
            <SectionHeading eyebrow="CONTACT / 04" title={display(language, 'تحدث إلى مهندس المشروع.', 'Speak with the project engineer.')} body={display(language, 'اكتب ما تحتاجه، وسنرد بمراجعة أولية مناسبة لمرحلة المشروع أو التخصص المطلوب.', 'Tell us what you need and we will return with a suitable initial review for your project stage or required specialty.')} />
            <div className="mt-10 grid gap-4 rounded-2xl border border-border bg-background/60 p-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-border bg-secondary text-primary"><Box className="size-4" /></span><span>{display(language, 'استشارة هندسية أولية', 'Initial engineering consultation')}</span></div>
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-border bg-secondary text-primary"><Gauge className="size-4" /></span><span>{display(language, 'تقدير سريع للمواد والزمان', 'Fast estimate for materials and lead time')}</span></div>
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-border bg-secondary text-primary"><Sparkles className="size-4" /></span><span>{display(language, 'ترتيب للتنفيذ أو التصميم', 'Next step for execution or design')}</span></div>
            </div>
          </div>
          <InquiryForm />
        </div>
      </section>
    </main>
  </Shell>;
}

export default HomePage;
