import { Link, useParams } from 'wouter';
import { ArrowLeft, Check } from 'lucide-react';
import { useGetService } from '@workspace/api-client-react';
import type { ServiceDetail } from '@workspace/api-client-react';

type Language = 'ar' | 'en';
const ar = (language: Language) => language === 'ar';

function display(language: Language, arabic: string, english: string): string {
  return ar(language) ? arabic : english;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex items-center gap-3 font-code text-[10px] font-medium tracking-[.24em] text-primary"><span className="h-px w-8 bg-primary" />{children}</div>;
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="max-w-2xl"><Eyebrow>{eyebrow}</Eyebrow><h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">{title}</h2>{body && <p className="mt-5 text-base leading-8 text-muted-foreground">{body}</p>}</div>;
}

export function ServiceDetailPage({ language = 'ar' }: { language?: Language }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const serviceQuery = useGetService(slug);
  const service = serviceQuery.data as ServiceDetail | undefined;

  if (serviceQuery.isLoading) return <main className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8"><div className="grid gap-3" data-testid="status-loading"><div className="h-5 w-32 animate-pulse rounded bg-secondary" /><div className="h-24 animate-pulse rounded-xl bg-secondary" /><p className="text-xs text-muted-foreground">جاري تحميل تفاصيل الخدمة</p></div></main>;
  if (serviceQuery.isError || !service) return <main className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8"><div className="border border-destructive/35 bg-destructive/10 p-5 rounded-xl" data-testid="status-error"><div className="flex items-start gap-3"><span className="mt-0.5 text-destructive">!</span><div className="flex-1"><p className="font-semibold text-foreground">تعذر تحميل تفاصيل الخدمة</p><p className="mt-1 text-sm text-muted-foreground">تعذر الوصول إلى بيانات المنصة. حاول مرة أخرى.</p></div><button type="button" onClick={() => serviceQuery.refetch()} className="text-sm font-semibold text-primary underline underline-offset-4" data-testid="button-retry">إعادة المحاولة</button></div></div></main>;

  const highlights = ar(language) ? service.highlightsAr : service.highlightsEn;
  const workflow = ar(language) ? service.workflowAr : service.workflowEn;
  const gallery = service.gallery ?? [];

  return <main className="pt-[74px]">
    <section className="relative overflow-hidden border-b border-border bg-[#071126] py-20"><div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_40%,hsl(211_100%_61%/.17),transparent_58%)]" /><div className="relative mx-auto max-w-7xl px-5 lg:px-8"><Link href="/#services" className="mb-14 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary" data-testid="link-back-services"><ArrowLeft className="size-3.5" />{display(language, 'كل الخدمات', 'All services')}</Link><div className="max-w-4xl"><Eyebrow>{service.category} / {service.duration}</Eyebrow><h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl" data-testid="text-service-title">{display(language, service.titleAr, service.titleEn)}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground" data-testid="text-service-description">{display(language, service.descriptionAr, service.descriptionEn)}</p></div></div></section>
    <section className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1fr_1.25fr] lg:px-8"><div><SectionHeading eyebrow="OUTCOME / 01" title={display(language, 'ما الذي ستحصل عليه؟', 'What you will get')} /><div className="mt-9 grid gap-3">{highlights.map((item, index) => <div key={index} className="flex gap-4 border-b border-border py-4" data-testid={`text-service-highlight-${index}`}><Check className="mt-1 size-4 shrink-0 text-primary" /><span className="text-sm leading-7">{item}</span></div>)}</div></div><div><Eyebrow>WORKFLOW / 02</Eyebrow><div className="grid gap-3">{workflow.map((item, index) => <div key={index} className="group flex gap-5 border border-border bg-card p-5 transition-colors hover:border-primary/60" data-testid={`card-workflow-${index}`}><span className="font-code text-xs text-primary">0{index + 1}</span><span className="text-sm leading-7">{item}</span></div>)}</div></div></section>
    {gallery.length > 0 && <section className="border-y border-border bg-[#071126] py-20" data-testid="section-service-gallery">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div dir={ar(language) ? 'rtl' : 'ltr'} className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div><SectionHeading eyebrow="PROJECT LOG / 03" title={display(language, 'أعمال تحوّلت إلى واقع.', 'Projects that moved into reality.')} body={display(language, 'نماذج اختبارية من المشاريع التي صممناها وطورناها لتعمل في أرض المصنع.', 'Test project stories showing how engineering decisions become working systems on the factory floor.')} /></div>
          <div className="font-code text-xs tracking-[.16em] text-primary">{String(gallery.length).padStart(2, '0')} / PROJECTS</div>
        </div>
        <div dir="ltr" className="mt-12 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          {gallery.map((project, index) => <figure key={`${project.image}-${index}`} dir={ar(language) ? 'rtl' : 'ltr'} className={`group relative overflow-hidden border border-border bg-card ${index === 0 ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'}`} data-testid={`card-service-gallery-${index}`}>
            <img src={project.image} alt={display(language, project.titleAr, project.titleEn)} className={`w-full object-cover grayscale transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0 ${index === 0 ? 'h-full min-h-[360px] lg:min-h-0' : 'aspect-[16/10]'}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071126] via-transparent to-transparent opacity-90" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 font-code text-[10px] tracking-[.16em] text-primary"><span>CASE / {String(index + 1).padStart(2, '0')}</span><span>{service.category}</span></div>
              <h3 className="mt-3 font-display text-xl font-bold sm:text-2xl">{display(language, project.titleAr, project.titleEn)}</h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-white/65">{display(language, project.descriptionAr, project.descriptionEn)}</p>
            </figcaption>
          </figure>)}
        </div>
      </div>
    </section>}
  </main>;
}

export default ServiceDetailPage;
