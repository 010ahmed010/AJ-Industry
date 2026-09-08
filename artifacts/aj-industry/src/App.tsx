import { type FormEvent, createContext, useContext, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCreateInquiry, useCreatePrintEstimate, useGetHomeContent, useGetService, useListMaterials, useListServices } from '@workspace/api-client-react';
import { ArrowLeft, ArrowUpRight, Box, Check, CircleAlert, Gauge, Mail, Menu, MessageCircle, MoveUpRight, Phone, Send, Sparkles, X, Zap } from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import type { HomeContent, Material, PrintEstimate, ServiceDetail, ServiceSummary } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { ContactPage, ServiceDetailPage as StructuredServiceDetailPage } from '@/pages/PublicSidePages';
import { ClientDashboardPage } from '@/pages/ClientSidePages';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#3d9bff',
    colorForeground: '#edf4ff',
    colorMutedForeground: '#9aabc4',
    colorDanger: '#ff746c',
    colorBackground: '#0b1528',
    colorInput: '#101f37',
    colorInputForeground: '#edf4ff',
    colorNeutral: '#2a4164',
    fontFamily: 'Space Grotesk, Cairo, sans-serif',
    borderRadius: '0.65rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#0b1528] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#2a4164]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#edf4ff] font-display',
    headerSubtitle: 'text-[#9aabc4]',
    socialButtonsBlockButtonText: 'text-[#edf4ff]',
    formFieldLabel: 'text-[#edf4ff]',
    footerActionLink: 'text-[#3d9bff]',
    footerActionText: 'text-[#9aabc4]',
    dividerText: 'text-[#9aabc4]',
    identityPreviewEditButton: 'text-[#3d9bff]',
    formFieldSuccessText: 'text-[#3ed7c0]',
    alertText: 'text-[#ff746c]',
    logoBox: 'h-10',
    logoImage: 'h-10 w-auto',
    socialButtonsBlockButton: 'border-[#2a4164] bg-[#101f37] hover:bg-[#172b4a]',
    formButtonPrimary: 'bg-[#3d9bff] text-[#071126] hover:bg-[#62adff]',
    formFieldInput: 'border-[#2a4164] bg-[#101f37] text-[#edf4ff]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#2a4164]',
    alert: 'border-[#7b363d] bg-[#321a25]',
    otpCodeFieldInput: 'border-[#2a4164] bg-[#101f37] text-[#edf4ff]',
    formFieldRow: 'gap-2',
    main: 'bg-transparent',
  },
};

type Language = 'ar' | 'en';
const LanguageContext = createContext<{ language: Language; toggle: () => void }>({ language: 'ar', toggle: () => undefined });
const useLanguage = () => useContext(LanguageContext);

function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ar');
  useEffect(() => {
    const saved = localStorage.getItem('aj-language') as Language | null;
    if (saved === 'en' || saved === 'ar') setLanguage(saved);
  }, []);
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('aj-language', language);
  }, [language]);
  return <LanguageContext.Provider value={{ language, toggle: () => setLanguage((current) => current === 'ar' ? 'en' : 'ar') }}>{children}</LanguageContext.Provider>;
}

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
  const { language, toggle } = useLanguage();
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const navigation = [
    { href: '/', ar: 'الرئيسية', en: 'Home' },
    { href: '/#services', ar: 'الخدمات', en: 'Services' },
    { href: '/print-3d', ar: 'الطباعة ثلاثية الأبعاد', en: '3D Printing' },
    { href: '/materials', ar: 'المواد', en: 'Materials' },
    { href: '/contact', ar: 'تواصل معنا', en: 'Contact' },
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
        <button type="button" onClick={toggle} className="group flex h-9 items-center gap-2 border border-border bg-secondary/50 px-3 text-xs font-semibold transition-colors hover:border-primary/60 hover:text-primary" data-testid="button-language-toggle" aria-label={display(language, 'تبديل اللغة إلى الإنجليزية', 'Switch language to Arabic')}>
          <span className="font-code text-[10px] text-primary">{language === 'ar' ? 'AR' : 'EN'}</span>
          <span className="hidden text-muted-foreground sm:inline">{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
        {isLoaded && isSignedIn ? (
          <>
            <Link href="/client" onClick={close} className="hidden h-9 items-center border border-primary/40 px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/10 sm:flex" data-testid="link-header-dashboard">
              {display(language, 'لوحة العميل', 'Client dashboard')}
            </Link>
            <button type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} className="hidden h-9 items-center border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex" data-testid="button-header-sign-out">
              {display(language, 'تسجيل الخروج', 'Sign out')}
            </button>
          </>
        ) : isLoaded ? (
          <>
            <Link href="/sign-in" onClick={close} className="hidden h-9 items-center border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex" data-testid="link-header-sign-in">
              {display(language, 'تسجيل الدخول', 'Sign in')}
            </Link>
            <Link href="/sign-up" onClick={close} className="hidden h-9 items-center bg-primary px-4 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:flex" data-testid="link-header-sign-up">
              {display(language, 'إنشاء حساب', 'Create account')}
            </Link>
          </>
        ) : null}
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
  const { language } = useLanguage();
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
  const { language } = useLanguage();
  const inquiry = useCreateInquiry();
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [success, setSuccess] = useState<{ reference: string; message: string } | null>(null);
  const [error, setError] = useState(false);
  const submit = (event: FormEvent) => {
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

function Home() {
  const { language } = useLanguage();
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
      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-border pt-[74px]" data-testid="section-hero">
        <video className="absolute inset-0 -z-20 h-[110svh] w-full bg-[#071126] object-fill opacity-50" autoPlay muted loop playsInline poster="/media/hero-section-poster.jpg" aria-hidden="true">
          <source src="/media/hero-section.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(224_52%_6%/.78)_0%,hsl(224_52%_6%/.86)_48%,hsl(224_52%_6%/.78)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_52%_45%,hsl(211_100%_61%/.15),transparent_42%)]" />
        <div className="absolute inset-0 -z-10 grid-tech opacity-20" />
        <div className="scanline pointer-events-none absolute left-[20%] top-0 -z-10 h-1/3 w-px bg-primary/40" />
        <div dir={ar(language) ? 'rtl' : 'ltr'} className="mx-auto flex min-h-[calc(100svh-74px)] max-w-7xl items-center justify-between gap-10 px-5 pb-28 pt-20 lg:px-8">
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
          <div dir="ltr">
            <div className="relative aspect-[4/3] overflow-hidden border border-border bg-card" data-testid="why-we-image-rotator" aria-live="polite">
              {whyWeImages.map((image, index) => <img key={image.src} src={image.src} alt={display(language, image.altAr, image.altEn)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === whyImageIndex ? 'opacity-100' : 'opacity-0'}`} data-testid={`img-why-we-${index + 1}`} />)}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#071126]/85 px-5 py-4 backdrop-blur-sm">
                <span className="font-code text-[10px] tracking-[.18em] text-primary">AJ / ENGINEERING INTELLIGENCE</span>
                <div className="flex gap-2" role="tablist" aria-label={display(language, 'صور لماذا نحن', 'Why we images')}>
                  {whyWeImages.map((image, index) => <button key={image.src} type="button" role="tab" aria-selected={index === whyImageIndex} aria-label={`${display(language, 'الصورة', 'Image')} ${index + 1}`} onClick={() => setWhyImageIndex(index)} className={`size-2 border border-primary transition-colors ${index === whyImageIndex ? 'bg-primary' : 'bg-transparent'}`} data-testid={`button-why-we-image-${index + 1}`} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="border-y border-border bg-[#071126] py-24" data-testid="section-services">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><SectionHeading eyebrow="CAPABILITIES / 02" title={display(language, 'من التصميم إلى خط الإنتاج.', 'From design to production floor.')} body={display(language, 'خدمات هندسية متخصصة، متصلة ببعضها لتقليل المخاطر وتسريع التنفيذ.', 'Specialist engineering services, connected to reduce risk and accelerate delivery.')} /><Link href="/#contact" className="flex shrink-0 items-center gap-2 text-sm font-bold text-primary hover:underline" data-testid="link-services-contact">{display(language, 'لست متأكداً من الخدمة؟ تحدث معنا', 'Not sure what you need? Talk to us')} <ArrowUpRight className="size-4" /></Link></div>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.isLoading && [0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse border border-border bg-card" data-testid={`skeleton-service-${item}`} />)}
            {services.isError && <div className="md:col-span-2 lg:col-span-3"><QueryNotice retry={() => services.refetch()} label="تعذر تحميل الخدمات" /></div>}
            {!services.isLoading && !services.isError && serviceList?.length === 0 && <div className="md:col-span-2 lg:col-span-3 border border-dashed border-border p-12 text-center text-muted-foreground" data-testid="empty-services">{display(language, 'لا توجد خدمات منشورة حالياً.', 'No published services yet.')}</div>}
            {serviceList?.map((service, index) => <ServiceCard key={service.slug} service={service} index={index} language={language} />)}
          </div>
          <div className="mt-12 overflow-hidden border border-border"><img src="/media/services-reference.png" alt={display(language, 'مشهد من قدرات التصنيع والهندسة', 'A reference view of manufacturing and engineering capabilities')} className="h-48 w-full object-cover opacity-55 grayscale transition-all duration-500 hover:opacity-80 hover:grayscale-0 sm:h-64" data-testid="img-services-reference" /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8" data-testid="section-process">
        <div className="grid gap-14 lg:grid-cols-[.8fr_1.5fr]"><div><SectionHeading eyebrow="PROCESS / 03" title={display(language, 'كل خطوة لها أثر.', 'Every step has a consequence.')} body={display(language, 'عملية واضحة، قابلة للمراجعة، مصممة لتضع المعرفة الصحيحة في يد القرار الصحيح.', 'A clear, reviewable process designed to put the right knowledge in the right decision.')}/><img src="/media/design-stages-reference.png" alt={display(language, 'مراحل التصميم الهندسي', 'Engineering design stages')} className="mt-10 w-full border border-border opacity-80" data-testid="img-design-stages" /></div><div className="grid gap-3 self-end sm:grid-cols-2">{(stages.length ? stages : Array.from({ length: 6 }, (_, index) => ({ number: index + 1, titleAr: ['جلسة الإحاطة', 'رسم المفهوم', 'النمذجة ثلاثية الأبعاد', 'المحاكاة', 'الرسومات التنفيذية', 'المراجعة والتسليم'][index], titleEn: ['Brief & meeting', 'Concept sketch', '3D modelling', 'Simulation', 'Technical drawings', 'Review & delivery'][index], descriptionAr: 'نحوّل المعطيات إلى قرار هندسي واضح.', descriptionEn: 'Turning inputs into a clear engineering decision.' }))).map((stage, index) => <div key={index} className="group flex gap-4 border border-border bg-card p-5 transition-colors hover:border-primary/60" data-testid={`card-stage-${index}`}><span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/50 bg-primary/10 font-code text-xs text-primary">{String(stage.number).padStart(2, '0')}</span><div><h3 className="font-semibold">{display(language, stage.titleAr, stage.titleEn)}</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">{display(language, stage.descriptionAr, stage.descriptionEn)}</p></div></div>)}</div></div>
      </section>

      <section className="relative overflow-hidden border-y border-primary/20 bg-primary/10 py-20" data-testid="section-print-callout">
        <div className="absolute -left-24 -top-32 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 md:flex-row md:items-center lg:px-8"><div><Eyebrow>RAPID PROTOTYPING / 04</Eyebrow><h2 className="max-w-2xl font-display text-3xl font-bold sm:text-5xl">{display(language, 'الفكرة لا تحتاج أن تنتظر.', 'Your idea does not need to wait.')}</h2><p className="mt-4 max-w-xl text-muted-foreground">{display(language, 'قدّر تكلفة نموذجك، اختر المادة المناسبة، وابدأ دورة تصنيع قصيرة اليوم.', 'Estimate your model, choose the right material, and start a short fabrication cycle today.')}</p></div><Link href="/print-3d" className="flex shrink-0 items-center gap-3 bg-primary px-6 py-4 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-1" data-testid="link-print-callout">{display(language, 'احسب تكلفة الطباعة', 'Estimate a print')} <MoveUpRight className="size-4" /></Link></div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-5 py-24 lg:px-8" data-testid="section-contact"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><SectionHeading eyebrow="CONTACT / 05" title={display(language, 'لنضع المشكلة على الطاولة.', 'Put the problem on the table.')} body={display(language, 'أرسل لنا السياق. سنعود إليك بأسئلة أفضل، وخطوة تالية واضحة.', 'Send us the context. We will come back with better questions and a clear next step.')} /><div className="mt-10 grid gap-3">
        <a href="mailto:hello@aj-industry.com" className="group flex items-center gap-3 border border-border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5" data-testid="button-home-contact-email">
          <span className="grid size-9 shrink-0 place-items-center border border-primary/30 bg-primary/10 text-primary"><Mail className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block font-code text-[9px] tracking-[.16em] text-muted-foreground">EMAIL / 01</span><span className="mt-1 block truncate text-sm font-semibold text-foreground">hello@aj-industry.com</span></span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" />
        </a>
        <a href="tel:+966500000000" className="group flex items-center gap-3 border border-border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5" data-testid="button-home-contact-phone">
          <span className="grid size-9 shrink-0 place-items-center border border-primary/30 bg-primary/10 text-primary"><Phone className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block font-code text-[9px] tracking-[.16em] text-muted-foreground">PHONE / 02</span><span className="mt-1 block truncate text-sm font-semibold text-foreground">+966 50 000 0000</span></span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" />
        </a>
        <a href="https://wa.me/966500000000" target="_blank" rel="noreferrer" className="group flex items-center gap-3 border border-accent/35 bg-accent/10 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-accent/70 hover:bg-accent/15" data-testid="button-home-contact-whatsapp">
          <span className="grid size-9 shrink-0 place-items-center border border-accent/40 bg-accent/10 text-accent"><MessageCircle className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block font-code text-[9px] tracking-[.16em] text-muted-foreground">WHATSAPP / 03</span><span className="mt-1 block truncate text-sm font-semibold text-foreground">+966 50 000 0000</span></span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent" />
        </a>
        <div className="flex gap-3 pt-2 font-code text-xs text-muted-foreground"><span className="text-primary">04</span><span>{display(language, 'الرياض / المملكة العربية السعودية', 'Riyadh / Saudi Arabia')}</span></div>
      </div></div><div className="border border-border bg-card p-6 sm:p-8"><InquiryForm /></div></div></section>
    </main>
  </Shell>;
}

function ServiceDetailPage() {
  const { language } = useLanguage();
  const { slug = '' } = useParams<{ slug: string }>();
  const serviceQuery = useGetService(slug);
  const service = serviceQuery.data as ServiceDetail | undefined;
  if (serviceQuery.isLoading) return <Shell><main className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8"><LoadingBlock label="جاري تحميل تفاصيل الخدمة" /></main></Shell>;
  if (serviceQuery.isError || !service) return <Shell><main className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8"><QueryNotice retry={() => serviceQuery.refetch()} label="تعذر تحميل تفاصيل الخدمة" /></main></Shell>;
  const highlights = ar(language) ? service.highlightsAr : service.highlightsEn;
  const workflow = ar(language) ? service.workflowAr : service.workflowEn;
  return <Shell><main className="pt-[74px]">
    <section className="relative overflow-hidden border-b border-border bg-[#071126] py-20"><div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_40%,hsl(211_100%_61%/.17),transparent_58%)]" /><div className="relative mx-auto max-w-7xl px-5 lg:px-8"><Link href="/#services" className="mb-14 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary" data-testid="link-back-services"><ArrowLeft className="size-3.5" />{display(language, 'كل الخدمات', 'All services')}</Link><div className="max-w-4xl"><Eyebrow>{service.category} / {service.duration}</Eyebrow><h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl" data-testid="text-service-title">{display(language, service.titleAr, service.titleEn)}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground" data-testid="text-service-description">{display(language, service.descriptionAr, service.descriptionEn)}</p></div></div></section>
    <section className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1fr_1.25fr] lg:px-8"><div><SectionHeading eyebrow="OUTCOME / 01" title={display(language, 'ما الذي ستحصل عليه؟', 'What you will get')} /><div className="mt-9 grid gap-3">{highlights.map((item, index) => <div key={index} className="flex gap-4 border-b border-border py-4" data-testid={`text-service-highlight-${index}`}><Check className="mt-1 size-4 shrink-0 text-primary" /><span className="text-sm leading-7">{item}</span></div>)}</div></div><div><Eyebrow>WORKFLOW / 02</Eyebrow><div className="grid gap-3">{workflow.map((item, index) => <div key={index} className="group flex gap-5 border border-border bg-card p-5 transition-colors hover:border-primary/60" data-testid={`card-workflow-${index}`}><span className="font-code text-xs text-primary">0{index + 1}</span><span className="text-sm leading-7">{item}</span></div>)}</div></div></section>
    <section className="border-y border-border bg-card/50 py-20"><div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1.1fr_.9fr] lg:px-8"><div><Eyebrow>READY WHEN YOU ARE</Eyebrow><h2 className="font-display text-4xl font-bold">{display(language, 'هل نبدأ من هذه النقطة؟', 'Ready to start here?')}</h2><p className="mt-4 max-w-xl text-muted-foreground">{display(language, 'شاركنا الرسومات أو القياسات أو حتى وصفاً أولياً للمشكلة.', 'Share drawings, measurements, or simply an early description of the problem.')}</p></div><div className="border border-border bg-background p-6 sm:p-8"><InquiryForm serviceSlug={service.slug} /></div></div></section>
  </main></Shell>;
}

function PrintEstimator() {
  const { language } = useLanguage();
  const materialsQuery = useListMaterials();
  const estimate = useCreatePrintEstimate();
  const materials = (materialsQuery.data as Material[] | undefined) ?? [];
  const [form, setForm] = useState({ materialId: '', weightGrams: '120', quantity: '1' });
  const [result, setResult] = useState<PrintEstimate | null>(null);
  const [error, setError] = useState(false);
  const selected = materials.find((item) => item.id === form.materialId);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError(false);
    estimate.mutate({ data: { materialId: form.materialId, weightGrams: Number(form.weightGrams), quantity: Number(form.quantity) } }, { onSuccess: (data) => setResult(data as PrintEstimate), onError: () => setError(true) });
  };
  useEffect(() => { if (!form.materialId && materials[0]) setForm((current) => ({ ...current, materialId: materials[0].id })); }, [materials, form.materialId]);
  return <Shell><main className="pt-[74px]">
    <section className="border-b border-border bg-[#071126] py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Eyebrow>3D PRINTING / ESTIMATOR</Eyebrow><h1 className="max-w-3xl font-display text-5xl font-bold leading-tight sm:text-7xl">{display(language, 'من ملفك إلى تقدير واضح.', 'From your file to a clear estimate.')}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{display(language, 'أدخل الوزن والخامة والكمية. سنعطيك نقطة بداية عملية للتكلفة والمدة.', 'Enter weight, material, and quantity. Get a practical starting point for cost and lead time.')}</p></div></section>
    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
      <div className="border border-border bg-card p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><Eyebrow>INPUT / 01</Eyebrow><h2 className="font-display text-2xl font-bold">{display(language, 'أخبرنا عن القطعة', 'Tell us about the part')}</h2></div><Box className="size-7 text-primary" /></div>
        {materialsQuery.isLoading && <div className="mt-8"><LoadingBlock label="جاري تحميل المواد" /></div>}
        {materialsQuery.isError && <div className="mt-8"><QueryNotice retry={() => materialsQuery.refetch()} label="تعذر تحميل المواد" /></div>}
        {!materialsQuery.isLoading && !materialsQuery.isError && materials.length === 0 && <div className="mt-8 border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-testid="empty-materials-estimator">{display(language, 'لا توجد خامات متاحة للتقدير حالياً.', 'No materials are available for estimating yet.')}</div>}
        <form onSubmit={submit} className="mt-8 grid gap-5" data-testid="form-print-estimator">
          <label className="grid gap-2 text-sm font-semibold"><span>{display(language, 'الخامة', 'Material')}</span><select required value={form.materialId} onChange={(event) => setForm({ ...form, materialId: event.target.value })} className="h-12 border border-input bg-background px-4 text-sm outline-none focus:border-primary" data-testid="select-print-material"><option value="" disabled>{display(language, 'اختر الخامة', 'Select a material')}</option>{materials.map((material) => <option value={material.id} key={material.id}>{material.name}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold"><span>{display(language, 'الوزن / قطعة (غرام)', 'Weight / part (g)')}</span><input required min="1" max="100000" type="number" value={form.weightGrams} onChange={(event) => setForm({ ...form, weightGrams: event.target.value })} className="h-12 border border-input bg-background px-4 font-code text-sm outline-none focus:border-primary" data-testid="input-print-weight" /></label><label className="grid gap-2 text-sm font-semibold"><span>{display(language, 'الكمية', 'Quantity')}</span><input required min="1" max="1000" type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="h-12 border border-input bg-background px-4 font-code text-sm outline-none focus:border-primary" data-testid="input-print-quantity" /></label></div>
          {error && <div className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-print-error">{display(language, 'تعذر إنشاء التقدير. تحقق من المدخلات.', 'Could not create estimate. Check your inputs.')}</div>}
          <button type="submit" disabled={estimate.isPending || !materials.length} className="flex h-12 items-center justify-center gap-2 bg-primary text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-print-estimate">{estimate.isPending ? display(language, 'جاري الحساب...', 'Calculating...') : display(language, 'احسب التقدير', 'Calculate estimate')} <Gauge className="size-4" /></button>
        </form>
        <div className="mt-8 border-t border-border pt-5 text-xs leading-6 text-muted-foreground"><p className="font-semibold text-foreground">{display(language, 'إرشادات الملف', 'File guidance')}</p><p className="mt-2">{display(language, 'نقبل ملفات STL و STEP و 3MF. للحصول على تقدير أدق، أرفق ملفاً نهائياً واتجاه الطباعة المطلوب.', 'We accept STL, STEP, and 3MF. For a sharper estimate, provide a final file and desired print orientation.')}</p></div>
      </div>
      <div className="lg:sticky lg:top-28 lg:self-start"><div className="border border-primary/30 bg-primary/10 p-7 sm:p-9" data-testid="panel-print-result"><Eyebrow>OUTPUT / 02</Eyebrow>{result ? <><div className="flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{display(language, 'التقدير المبدئي', 'Preliminary estimate')}</p><p className="mt-2 font-code text-5xl font-semibold text-primary" data-testid="text-estimated-cost">{result.estimatedCost.toLocaleString()} <span className="text-xl">{result.currency}</span></p></div><Sparkles className="size-7 text-accent" /></div><div className="mt-8 grid gap-3 border-t border-primary/20 pt-5 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{display(language, 'الكمية', 'Quantity')}</span><span className="font-code" data-testid="text-estimated-quantity">{result.quantity}</span></div><div className="flex justify-between"><span className="text-muted-foreground">{display(language, 'المدة المتوقعة', 'Estimated lead time')}</span><span className="font-code" data-testid="text-estimated-lead">{result.estimatedLeadDays} {display(language, 'أيام', 'days')}</span></div></div><p className="mt-7 text-sm leading-7 text-muted-foreground" data-testid="text-estimated-note">{display(language, result.noteAr, result.noteEn)}</p><Link href="/#contact" className="mt-7 flex h-11 items-center justify-center gap-2 border border-primary/40 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground" data-testid="link-estimate-inquiry">{display(language, 'تحويل التقدير إلى طلب', 'Turn estimate into a request')} <ArrowUpRight className="size-4" /></Link></> : <div className="min-h-64"><div className="grid size-12 place-items-center border border-primary/30 bg-background/30"><Zap className="size-5 text-primary" /></div><h2 className="mt-7 font-display text-2xl font-bold">{display(language, 'نتيجتك ستظهر هنا.', 'Your result will appear here.')}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{display(language, 'أدخل بيانات القطعة لتحصل على تكلفة تقريبية وموعد تسليم متوقع.', 'Enter the part details to get an approximate cost and expected delivery date.')}</p></div>}</div><Link href="/materials" className="mt-4 flex items-center justify-between border border-border bg-card p-5 text-sm transition-colors hover:border-primary" data-testid="link-estimator-materials"><span>{display(language, 'تحتاج مساعدة في اختيار الخامة؟', 'Need help choosing a material?')}</span><ArrowUpRight className="size-4 text-primary" /></Link></div>
    </section>
  </main></Shell>;
}

function MaterialsPage() {
  const { language } = useLanguage();
  const materialsQuery = useListMaterials();
  const materials = (materialsQuery.data as Material[] | undefined) ?? [];
  return <Shell><main className="pt-[74px]">
    <section className="border-b border-border bg-[#071126] py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Eyebrow>MATERIALS / REFERENCE</Eyebrow><h1 className="max-w-4xl font-display text-5xl font-bold leading-tight sm:text-7xl">{display(language, 'الخامة قرار هندسي.', 'Material is an engineering decision.')}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{display(language, 'قارن بين الاستخدام، الخصائص، والأمثلة قبل أن تبدأ دورة الطباعة.', 'Compare application, characteristics, and examples before starting a print cycle.')}</p></div></section>
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-10 flex items-end justify-between gap-6"><SectionHeading eyebrow="MATRIX / 01" title={display(language, 'اختر ما يناسب المهمة.', 'Choose for the job.')} /><Link href="/#contact" className="hidden items-center gap-2 text-sm font-bold text-primary sm:flex" data-testid="link-materials-inquiry">{display(language, 'اسأل مهندساً', 'Ask an engineer')} <ArrowUpRight className="size-4" /></Link></div>
      {materialsQuery.isLoading && <LoadingBlock label="جاري تحميل مصفوفة المواد" />}
      {materialsQuery.isError && <QueryNotice retry={() => materialsQuery.refetch()} label="تعذر تحميل المواد" />}
      {!materialsQuery.isLoading && !materialsQuery.isError && materials.length === 0 && <div className="border border-dashed border-border p-14 text-center text-muted-foreground" data-testid="empty-materials">{display(language, 'لا توجد مواد منشورة حالياً.', 'No published materials yet.')}</div>}
      <div className="grid gap-4">{materials.map((material, index) => <article key={material.id} className="group border border-border bg-card p-6 transition-colors hover:border-primary/60 sm:p-8" data-testid={`card-material-${material.id}`}><div className="grid gap-8 lg:grid-cols-[.7fr_1.1fr_1.1fr_.55fr] lg:items-center"><div><span className="font-code text-xs text-primary">0{index + 1} / {material.id}</span><h2 className="mt-3 font-display text-2xl font-bold" data-testid={`text-material-name-${material.id}`}>{material.name}</h2></div><div><p className="font-code text-[10px] tracking-[.16em] text-muted-foreground">APPLICATION</p><p className="mt-2 text-sm leading-7">{ar(language) ? material.applicationAr : material.applicationEn}</p></div><div><p className="font-code text-[10px] tracking-[.16em] text-muted-foreground">CHARACTERISTICS</p><p className="mt-2 text-sm leading-7">{ar(language) ? material.characteristicsAr : material.characteristicsEn}</p><p className="mt-2 text-xs text-muted-foreground">{display(language, 'أمثلة: ', 'Examples: ')}{ar(language) ? material.examplesAr : material.examplesEn}</p></div><div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><p className="font-code text-2xl text-primary">{material.pricePerGram.toFixed(2)} <span className="text-xs">/ g</span></p><p className="mt-2 text-xs text-muted-foreground">{material.leadDays} {display(language, 'أيام تجهيز', 'lead days')}</p></div></div></article>)}</div>
      <div className="mt-10 flex flex-col items-start justify-between gap-5 border border-primary/30 bg-primary/10 p-7 sm:flex-row sm:items-center sm:p-9"><div><p className="font-display text-xl font-bold">{display(language, 'لم تجد الإجابة؟', 'Still deciding?')}</p><p className="mt-2 text-sm text-muted-foreground">{display(language, 'أرسل لنا تطبيق القطعة وسنرشح لك نقطة بداية مناسبة.', 'Send us the part application and we will suggest a sensible starting point.')}</p></div><Link href="/#contact" className="flex shrink-0 items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-materials-cta">{display(language, 'اطلب ترشيحاً', 'Request a recommendation')} <ArrowUpRight className="size-4" /></Link></div>
    </section>
  </main></Shell>;
}

function AuthPage({ kind }: { kind: 'sign-in' | 'sign-up' }) {
  const Component = kind === 'sign-in' ? SignIn : SignUp;
  const { language } = useLanguage();
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-10">
      <div className="mx-auto mb-6 flex max-w-[440px] items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary" data-testid={`link-auth-home-${kind}`}>
          <span className="grid size-9 place-items-center border border-primary/50 bg-primary/10 font-code text-xs font-bold text-primary">AJ</span>
          <span>{display(language, 'العودة إلى الصفحة الرئيسية', 'Back to home')}</span>
        </Link>
        <span className="font-code text-[9px] tracking-[.18em] text-primary">AJ—INDUSTRY</span>
      </div>
      <Component
        routing="path"
        path={`${basePath}/${kind}`}
        {...(kind === 'sign-in' ? { signUpUrl: `${basePath}/sign-up` } : { signInUrl: `${basePath}/sign-in` })}
      />
    </div>
  );
}

function ClientPortalRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="grid min-h-[100dvh] place-items-center bg-background font-code text-xs text-muted-foreground">LOADING / AUTHENTICATION</div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <ClientDashboardPage />;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Home />;
  return isSignedIn ? <Redirect to="/client" /> : <Home />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const nextUserId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) queryClient.clear();
      previousUserId.current = nextUserId;
    });
    return unsubscribe;
  }, [addListener]);
  return null;
}

function AuthenticatedRouter() {
  const [location] = useLocation();
  const { language } = useLanguage();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={() => <AuthPage kind="sign-in" />} /><Route path="/sign-up/*?" component={() => <AuthPage kind="sign-up" />} /><Route path="/services/:slug">{() => <Shell><StructuredServiceDetailPage language={language} /></Shell>}</Route><Route path="/print-3d" component={PrintEstimator} /><Route path="/materials" component={MaterialsPage} /><Route path="/contact">{() => <Shell><ContactPage language={language} /></Shell>}</Route><Route path="/client" component={ClientPortalRoute} /><Route path="/client/printing" component={ClientPortalRoute} /><Route path="/client/settings" component={ClientPortalRoute} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
  return <QueryClientProvider client={queryClient}><TooltipProvider><LanguageProvider><WouterRouter base={basePath}><ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to access your client workspace' } }, signUp: { start: { title: 'Create your client account', subtitle: 'Keep your AJ project requests in one place' } } }}><ClerkQueryClientCacheInvalidator /><AuthenticatedRouter /></ClerkProvider></WouterRouter></LanguageProvider><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;