import { Link } from 'wouter';
import { ArrowUpRight } from 'lucide-react';
import { useListMaterials } from '@workspace/api-client-react';
import type { Material } from '@workspace/api-client-react';

type Language = 'ar' | 'en';
const ar = (language: Language) => language === 'ar';

function display(language: Language, arabic: string, english: string): string {
  return ar(language) ? arabic : english;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex items-center gap-3 font-code text-[10px] font-medium tracking-[.24em] text-primary"><span className="h-px w-8 bg-primary" />{children}</div>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="max-w-2xl"><Eyebrow>{eyebrow}</Eyebrow><h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">{title}</h2></div>;
}

export function MaterialsPage({ language = 'ar' }: { language?: Language }) {
  const materialsQuery = useListMaterials();
  const materials = (materialsQuery.data as Material[] | undefined) ?? [];

  return <main className="pt-[74px]">
    <section className="border-b border-border bg-[#071126] py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Eyebrow>MATERIALS / REFERENCE</Eyebrow><h1 className="max-w-4xl font-display text-5xl font-bold leading-tight sm:text-7xl">{display(language, 'الخامة قرار هندسي.', 'Material is an engineering decision.')}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{display(language, 'قارن بين الاستخدام، الخصائص، والأمثلة قبل أن تبدأ دورة الطباعة.', 'Compare application, characteristics, and examples before starting a print cycle.')}</p></div></section>
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-10 flex items-end justify-between gap-6"><SectionHeading eyebrow="MATRIX / 01" title={display(language, 'اختر ما يناسب المهمة.', 'Choose for the job.')} /><Link href="/#contact" className="hidden items-center gap-2 text-sm font-bold text-primary sm:flex" data-testid="link-materials-inquiry">{display(language, 'اسأل مهندساً', 'Ask an engineer')} <ArrowUpRight className="size-4" /></Link></div>
      {materialsQuery.isLoading && <div className="grid gap-3" data-testid="status-loading"><div className="h-5 w-32 animate-pulse rounded bg-secondary" /><div className="h-24 animate-pulse rounded-xl bg-secondary" /><p className="text-xs text-muted-foreground">جاري تحميل مصفوفة المواد</p></div>}
      {materialsQuery.isError && <div className="border border-destructive/35 bg-destructive/10 p-5 rounded-xl" data-testid="status-error"><div className="flex items-start gap-3"><span className="mt-0.5 text-destructive">!</span><div className="flex-1"><p className="font-semibold text-foreground">تعذر تحميل المواد</p><p className="mt-1 text-sm text-muted-foreground">تعذر الوصول إلى بيانات المنصة. حاول مرة أخرى.</p></div><button type="button" onClick={() => materialsQuery.refetch()} className="text-sm font-semibold text-primary underline underline-offset-4" data-testid="button-retry">إعادة المحاولة</button></div></div>}
      {!materialsQuery.isLoading && !materialsQuery.isError && materials.length === 0 && <div className="border border-dashed border-border p-14 text-center text-muted-foreground" data-testid="empty-materials">{display(language, 'لا توجد مواد منشورة حالياً.', 'No published materials yet.')}</div>}
      <div className="grid gap-4">{materials.map((material, index) => <article key={material.id} className="group border border-border bg-card p-6 transition-colors hover:border-primary/60 sm:p-8" data-testid={`card-material-${material.id}`}><div className="grid gap-8 lg:grid-cols-[.7fr_1.1fr_1.1fr_.55fr] lg:items-center"><div><span className="font-code text-xs text-primary">0{index + 1} / {material.id}</span><h2 className="mt-3 font-display text-2xl font-bold" data-testid={`text-material-name-${material.id}`}>{material.name}</h2></div><div><p className="font-code text-[10px] tracking-[.16em] text-muted-foreground">APPLICATION</p><p className="mt-2 text-sm leading-7">{ar(language) ? material.applicationAr : material.applicationEn}</p></div><div><p className="font-code text-[10px] tracking-[.16em] text-muted-foreground">CHARACTERISTICS</p><p className="mt-2 text-sm leading-7">{ar(language) ? material.characteristicsAr : material.characteristicsEn}</p><p className="mt-2 text-xs text-muted-foreground">{display(language, 'أمثلة: ', 'Examples: ')}{ar(language) ? material.examplesAr : material.examplesEn}</p></div><div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><p className="font-code text-2xl text-primary">{material.pricePerGram.toFixed(2)} <span className="text-xs">/ g</span></p><p className="mt-2 text-xs text-muted-foreground">{material.leadDays} {display(language, 'أيام تجهيز', 'lead days')}</p></div></div></article>)}</div>
      <div className="mt-10 flex flex-col items-start justify-between gap-5 border border-primary/30 bg-primary/10 p-7 sm:flex-row sm:items-center sm:p-9"><div><p className="font-display text-xl font-bold">{display(language, 'لم تجد الإجابة؟', 'Still deciding?')}</p><p className="mt-2 text-sm text-muted-foreground">{display(language, 'أرسل لنا تطبيق القطعة وسنرشح لك نقطة بداية مناسبة.', 'Send us the part application and we will suggest a sensible starting point.')}</p></div><Link href="/#contact" className="flex shrink-0 items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-materials-cta">{display(language, 'اطلب ترشيحاً', 'Request a recommendation')} <ArrowUpRight className="size-4" /></Link></div>
    </section>
  </main>;
}

export default MaterialsPage;
