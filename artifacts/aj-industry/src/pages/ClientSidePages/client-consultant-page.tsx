import { ArrowUpRight, BriefcaseBusiness, Building2, Check, ExternalLink, Mail, MessageCircle, Phone, ShieldCheck, UserRound } from 'lucide-react';
import {
  clientText,
  PageIntro,
  Panel,
  PanelHeader,
  Tag,
  useClientDashboard,
} from './client-dashboard-shell';

type Referral = {
  name: string;
  specialtyAr: string;
  specialtyEn: string;
  location: string;
  initials: string;
  type: 'individual' | 'company';
  href: string;
  signalAr: string;
  signalEn: string;
};

const referrals: Referral[] = [
  { name: 'م. نورة العتيبي', specialtyAr: 'هندسة كهربائية وتحكم', specialtyEn: 'Electrical engineering & controls', location: 'Riyadh / KSA', initials: 'NO', type: 'individual', href: 'mailto:noura.controls@example.com', signalAr: 'متاحة هذا الأسبوع', signalEn: 'Available this week' },
  { name: 'Fahad Al-Mutairi', specialtyAr: 'تصميم صناعي وCAD', specialtyEn: 'Industrial design & CAD', location: 'Jeddah / KSA', initials: 'FM', type: 'individual', href: 'mailto:fahad.design@example.com', signalAr: 'موصى به من AJ', signalEn: 'AJ recommended' },
  { name: 'Madar Automation', specialtyAr: 'تكامل خطوط الإنتاج', specialtyEn: 'Production line integration', location: 'Dammam / KSA', initials: 'MA', type: 'company', href: 'https://madar-automation.example.com', signalAr: 'شريك معتمد', signalEn: 'Partner network' },
  { name: 'Studio 17', specialtyAr: 'تصميم منتج ونمذجة', specialtyEn: 'Product design & visualization', location: 'Riyadh / KSA', initials: 'S17', type: 'company', href: 'https://studio17.example.com', signalAr: 'خبرة في النماذج الأولية', signalEn: 'Prototype focused' },
];

export function ClientConsultantPage() {
  const { language } = useClientDashboard();
  const whatsappHref = `https://wa.me/966500000000?text=${encodeURIComponent(clientText(language, 'مرحباً فريق AJ، أحتاج إلى استشارة حول مشروعي.', 'Hello AJ team, I need a consultation about my project.'))}`;

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageIntro
        code="SUPPORT / 03 — CONSULTANT DESK"
        title={clientText(language, 'مكتب الاستشارة والشركاء', 'Consultant & partner desk')}
        description={clientText(language, 'مسار مباشر مع فريق AJ، مع شبكة مختارة من الخبرات التي تكمل قرارك الهندسي.', 'A direct line to AJ, plus a selected network of specialists who complete your engineering decision.')}
        action={<Tag tone="green">{clientText(language, 'متوسط الرد 04 ساعات', '04 H RESPONSE')}</Tag>}
      />

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <Panel className="relative overflow-hidden bg-[#071126]">
          <div className="absolute inset-0 grid-tech opacity-20" />
          <div className="absolute bottom-0 end-0 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center border border-primary/45 bg-primary/10 text-primary"><MessageCircle className="size-5" /></span><div><p className="font-code text-[9px] tracking-[.16em] text-primary">AJ / DIRECT LINE</p><p className="mt-1 text-xs text-muted-foreground">{clientText(language, 'فريق الهندسة والدعم', 'Engineering & support team')}</p></div></div><span className="font-code text-[9px] text-accent">ONLINE</span></div>
            <h2 className="mt-12 max-w-xl font-display text-3xl font-bold leading-tight sm:text-4xl">{clientText(language, 'قرار هندسي واحد، بعيداً عن عشرات الرسائل.', 'One engineering decision, without ten disconnected conversations.')}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{clientText(language, 'أرسل سؤالك أو ملفك لفريق AJ. سنحدد الخطوة التالية، ونوصلك بالشريك المناسب عندما يتطلب المشروع تخصصاً إضافياً.', 'Send your question or file to AJ. We will define the next step and connect you to the right specialist when the project needs another discipline.')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"><MessageCircle className="size-4" />{clientText(language, 'ابدأ محادثة واتساب', 'Start WhatsApp chat')} <ArrowUpRight className="size-4" /></a>
              <a href="tel:+966500000000" className="inline-flex h-12 items-center justify-center gap-2 border border-border bg-background/35 px-5 text-sm font-bold transition-colors hover:border-primary hover:text-primary"><Phone className="size-4" />+966 50 000 0000</a>
            </div>
            <div className="mt-8 grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-3">
              {[clientText(language, 'رد أولي خلال 04 ساعات', 'First response in 04 hours'), clientText(language, 'تواصل عربي أو إنجليزي', 'Arabic or English support'), clientText(language, 'ملفاتك تبقى خاصة', 'Your files stay private')].map((item) => <div key={item} className="flex gap-2 text-xs text-muted-foreground"><Check className="size-3.5 shrink-0 text-accent" />{item}</div>)}
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="HOW IT WORKS / 01" title={clientText(language, 'ثلاث خطوات إلى الإجابة', 'Three steps to an answer')} />
          <div className="divide-y divide-border/70">
            {[
              { code: '01', title: clientText(language, 'صف المشكلة', 'Describe the problem'), body: clientText(language, 'أخبرنا أين يتعطل التصميم أو الإنتاج، حتى لو كانت الملاحظات أولية.', 'Tell us where design or production is stuck, even if your notes are rough.'), icon: Mail },
              { code: '02', title: clientText(language, 'نحدد المسار', 'We map the path'), body: clientText(language, 'يراجع المهندس السياق ويقترح مخرجاً واضحاً أو شريكاً متخصصاً.', 'An engineer reviews the context and proposes a clear output or specialist.'), icon: ShieldCheck },
              { code: '03', title: clientText(language, 'تتحرك بثقة', 'You move with confidence'), body: clientText(language, 'تغادر المحادثة بقرار قابل للتنفيذ، لا بقائمة جديدة من الأسئلة.', 'You leave with an executable decision, not another list of questions.'), icon: ArrowUpRight },
            ].map((item) => {
              const Icon = item.icon;
              return <div key={item.code} className="flex gap-4 p-5 sm:p-6"><span className="font-code text-xs text-primary">{item.code}</span><span className="grid size-8 shrink-0 place-items-center border border-border bg-secondary/40 text-primary"><Icon className="size-3.5" /></span><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{item.body}</p></div></div>;
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-10 flex items-end justify-between gap-4"><div><p className="font-code text-[9px] tracking-[.2em] text-primary">CURATED NETWORK / 02</p><h2 className="mt-3 font-display text-2xl font-bold">{clientText(language, 'شبكة الشركاء والخبراء', 'Partners and specialists')}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{clientText(language, 'أسماء يثق بها فريق AJ عندما يتسع نطاق المشروع خارج خدماتنا المباشرة.', 'People AJ trusts when a project extends beyond our direct services.')}</p></div><span className="hidden font-code text-[10px] text-muted-foreground sm:block">04 / VERIFIED CONTACTS</span></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {referrals.map((referral) => (
          <article key={referral.name} className="group flex flex-col justify-between gap-5 border border-border/80 bg-card/65 p-5 transition-colors hover:border-primary/55 sm:flex-row sm:items-center sm:p-6">
            <div className="flex min-w-0 items-start gap-4"><span className="grid size-11 shrink-0 place-items-center border border-primary/30 bg-primary/10 font-code text-xs text-primary">{referral.initials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-bold">{referral.name}</h3><Tag tone="muted">{referral.type === 'company' ? clientText(language, 'شركة', 'COMPANY') : clientText(language, 'مستقل', 'FREELANCE')}</Tag></div><p className="mt-2 text-sm text-muted-foreground">{clientText(language, referral.specialtyAr, referral.specialtyEn)}</p><p className="mt-2 font-code text-[9px] text-muted-foreground">{referral.location}</p></div></div>
            <div className="flex shrink-0 items-center justify-between gap-5 sm:block sm:text-end"><p className="font-code text-[9px] text-accent">{clientText(language, referral.signalAr, referral.signalEn)}</p><a href={referral.href} target={referral.href.startsWith('http') ? '_blank' : undefined} rel={referral.href.startsWith('http') ? 'noreferrer' : undefined} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">{clientText(language, 'فتح جهة الاتصال', 'Open contact')} {referral.href.startsWith('http') ? <ExternalLink className="size-3.5" /> : <Mail className="size-3.5" />}</a></div>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[{ icon: UserRound, label: clientText(language, 'خبراء مستقلون', 'Independent experts'), value: '02' }, { icon: Building2, label: clientText(language, 'شركات شريكة', 'Partner companies'), value: '02' }, { icon: BriefcaseBusiness, label: clientText(language, 'تخصصات صناعية', 'Industrial disciplines'), value: '07' }].map((item) => <div key={item.label} className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4"><item.icon className="size-4 text-primary" /><span className="text-xs text-muted-foreground">{item.label}</span><span className="ms-auto font-code text-sm text-foreground">{item.value}</span></div>)}
      </div>
    </div>
  );
}

export default ClientConsultantPage;