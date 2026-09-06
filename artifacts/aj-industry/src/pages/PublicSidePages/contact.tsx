import { ArrowUpRight, Clock3, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { Link } from 'wouter';

type Language = 'ar' | 'en';

const display = (language: Language, arabic: string, english: string) => language === 'ar' ? arabic : english;

const contactMethods = [
  {
    icon: MessageCircle,
    labelAr: 'واتساب',
    labelEn: 'WhatsApp',
    value: '095 331 6416',
    href: 'https://wa.me/963953316416',
    accent: 'border-accent/35 bg-accent/10',
  },
  {
    icon: Phone,
    labelAr: 'اتصال مباشر',
    labelEn: 'Direct line',
    value: '095 331 6416',
    href: 'tel:+963953316416',
    accent: 'border-primary/35 bg-primary/10',
  },
  {
    icon: Mail,
    labelAr: 'البريد الإلكتروني',
    labelEn: 'Email',
    value: 'amj.tech.work@gmail.com',
    href: 'mailto:amj.tech.work@gmail.com',
    accent: 'border-primary/35 bg-primary/10',
  },
];

export default function ContactPage({ language }: { language: Language }) {
  return <main className="pt-[74px]">
    <section className="border-b border-border bg-[#071126] py-20">
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3 font-code text-[10px] font-medium tracking-[.24em] text-primary"><span className="h-px w-8 bg-primary" />CONTACT / 05</div>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            {display(language, 'تواصل معنا لنحوّل الفكرة إلى حركة.', 'Let’s turn your next idea into motion.')}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            {display(language, 'ضع المشكلة على الطاولة. سنعود إليك بأسئلة أفضل، وموقع واضح للخطوة التالية.', 'Put the problem on the table. We will come back with better questions and a clear next step.')}
          </p>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div dir="ltr" className="grid gap-7 lg:grid-cols-[1.05fr_.95fr]">
        <div dir="ltr" className="grid gap-5">
          <div className="group relative overflow-hidden border border-border bg-card">
            <img
              src="/media/why-we-2.png"
              alt={display(language, 'مشهد من بيئة التصنيع والهندسة', 'A view of an industrial engineering environment')}
              className="h-48 w-full object-cover opacity-75 grayscale transition-all duration-500 group-hover:scale-[1.02] group-hover:opacity-100 group-hover:grayscale-0 sm:h-60"
              data-testid="img-contact-company"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#071126]/85 px-5 py-3 backdrop-blur-sm">
              <span className="font-code text-[10px] tracking-[.2em] text-primary">FIELD OFFICE / 01</span>
              <span className="text-xs text-muted-foreground">{display(language, 'بيئة العمل', 'Working environment')}</span>
            </div>
          </div>

          <div className="relative overflow-hidden border border-border bg-[#0a1a2b]" data-testid="contact-map-frame">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(hsl(211_100%_61%/.16)_1px,transparent_1px),linear-gradient(90deg,hsl(211_100%_61%/.16)_1px,transparent_1px)] [background-size:38px_38px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,hsl(211_100%_61%/.22),transparent_32%)]" />
            <div className="absolute left-[6%] top-[25%] h-px w-[92%] rotate-[13deg] bg-primary/25" />
            <div className="absolute left-[10%] top-[68%] h-1 w-[85%] rotate-[-20deg] bg-primary/20" />
            <div className="absolute left-[22%] top-[6%] h-[94%] w-px rotate-[27deg] bg-primary/20" />
            <div className="absolute left-[61%] top-[3%] h-[92%] w-px rotate-[-38deg] bg-primary/20" />
            <div className="relative min-h-[310px] p-5 sm:min-h-[360px] sm:p-7">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2 font-code text-[10px] tracking-[.15em] text-primary"><MapPin className="size-3.5" /> LOCATION / 02</div>
                <span className="font-code text-[10px] text-muted-foreground">LIVE AREA</span>
              </div>
              <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
                <span className="absolute size-20 animate-pulse rounded-full border border-primary/30" />
                <span className="absolute size-11 rounded-full border border-primary/50 bg-primary/10" />
                <span className="relative grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_35px_hsl(211_100%_61%/.65)]"><MapPin className="size-4 fill-current" /></span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7">
                <div className="bg-[#071126]/80 p-4 backdrop-blur-sm">
                  <p className="font-display text-sm font-bold">{display(language, 'حلب / سوريا', 'Aleppo / Syria')}</p>
                  <p className="mt-1 font-code text-[10px] text-muted-foreground">AZAZ / INDUSTRIAL ZONE</p>
                </div>
                <div className="text-right font-code text-[10px] leading-6 text-muted-foreground">
                  <p>36.5868° N</p>
                  <p>37.0463° E</p>
                </div>
              </div>
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=Azaz%2C%20Aleppo%2C%20Syria" target="_blank" rel="noreferrer" className="relative flex items-center justify-between border-t border-border/70 bg-[#071126]/75 px-5 py-4 text-xs font-semibold transition-colors hover:text-primary sm:px-7" data-testid="link-contact-map">
              <span>{display(language, 'فتح الموقع على الخريطة', 'Open location in maps')}</span>
              <Navigation className="size-4 text-primary" />
            </a>
          </div>
        </div>

        <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="border border-border bg-card p-6 sm:p-8 lg:self-start">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="mb-5 flex items-center gap-3 font-code text-[10px] font-medium tracking-[.2em] text-primary"><span className="h-px w-8 bg-primary" />CHANNELS / 03</div>
              <h2 className="font-display text-3xl font-bold">{display(language, 'معلومات التواصل', 'Contact information')}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{display(language, 'اختر القناة الأنسب، وسنكون جاهزين لسماع تفاصيل مشروعك.', 'Choose the channel that works best and tell us about your project.')}</p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center border border-primary/40 bg-primary/10 text-primary"><MessageCircle className="size-4" /></span>
          </div>

          <div className="mt-8 grid gap-3">
            {contactMethods.map(({ icon: Icon, labelAr, labelEn, value, href, accent }) => <a key={href} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className={`group flex items-center gap-4 border px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 ${accent}`} data-testid={`link-contact-${labelEn.toLowerCase().replace(' ', '-')}`}>
              <span className="grid size-10 shrink-0 place-items-center border border-primary/30 bg-background/30 text-primary"><Icon className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block font-code text-[10px] tracking-[.16em] text-muted-foreground">{display(language, labelAr, labelEn)}</span><span className="mt-1 block truncate text-sm font-semibold">{value}</span></span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" />
            </a>)}
          </div>

          <div className="mt-7 border-t border-border pt-6">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center border border-border bg-background/40 text-primary"><Clock3 className="size-4" /></span>
              <div><p className="font-semibold">{display(language, 'ساعات الاستجابة', 'Response hours')}</p><p className="mt-1 text-sm leading-7 text-muted-foreground">{display(language, 'الأحد — الخميس / 09:00 — 18:00', 'Sunday — Thursday / 09:00 — 18:00')}</p></div>
            </div>
          </div>

          <Link href="/#contact" className="mt-8 flex h-12 items-center justify-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-contact-inquiry">
            {display(language, 'أرسل طلباً هندسياً', 'Send an engineering brief')} <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  </main>;
}