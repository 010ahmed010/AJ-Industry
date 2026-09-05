import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Box, Gauge, Sparkles, Zap } from 'lucide-react';
import { useCreatePrintEstimate, useListMaterials } from '@workspace/api-client-react';
import type { Material, PrintEstimate } from '@workspace/api-client-react';

type Language = 'ar' | 'en';
const ar = (language: Language) => language === 'ar';

function display(language: Language, arabic: string, english: string): string {
  return ar(language) ? arabic : english;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex items-center gap-3 font-code text-[10px] font-medium tracking-[.24em] text-primary"><span className="h-px w-8 bg-primary" />{children}</div>;
}

export function PrintEstimatorPage({ language = 'ar' }: { language?: Language }) {
  const materialsQuery = useListMaterials();
  const estimate = useCreatePrintEstimate();
  const materials = (materialsQuery.data as Material[] | undefined) ?? [];
  const [form, setForm] = useState({ materialId: '', weightGrams: '120', quantity: '1' });
  const [result, setResult] = useState<PrintEstimate | null>(null);
  const [error, setError] = useState(false);
  const selected = materials.find((item) => item.id === form.materialId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError(false);
    estimate.mutate({ data: { materialId: form.materialId, weightGrams: Number(form.weightGrams), quantity: Number(form.quantity) } }, { onSuccess: (data) => setResult(data as PrintEstimate), onError: () => setError(true) });
  };

  useEffect(() => { if (!form.materialId && materials[0]) setForm((current) => ({ ...current, materialId: materials[0].id })); }, [materials, form.materialId]);

  return <main className="pt-[74px]">
    <section className="border-b border-border bg-[#071126] py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><Eyebrow>3D PRINTING / ESTIMATOR</Eyebrow><h1 className="max-w-3xl font-display text-5xl font-bold leading-tight sm:text-7xl">{display(language, 'من ملفك إلى تقدير واضح.', 'From your file to a clear estimate.')}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{display(language, 'أدخل الوزن والخامة والكمية. سنعطيك نقطة بداية عملية للتكلفة والمدة.', 'Enter weight, material, and quantity. Get a practical starting point for cost and lead time.')}</p></div></section>
    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
      <div className="border border-border bg-card p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><Eyebrow>INPUT / 01</Eyebrow><h2 className="font-display text-2xl font-bold">{display(language, 'أخبرنا عن القطعة', 'Tell us about the part')}</h2></div><Box className="size-7 text-primary" /></div>
        {materialsQuery.isLoading && <div className="mt-8"><div className="grid gap-3" data-testid="status-loading"><div className="h-5 w-32 animate-pulse rounded bg-secondary" /><div className="h-24 animate-pulse rounded-xl bg-secondary" /><p className="text-xs text-muted-foreground">جاري تحميل المواد</p></div></div>}
        {materialsQuery.isError && <div className="mt-8"><div className="border border-destructive/35 bg-destructive/10 p-5 rounded-xl" data-testid="status-error"><div className="flex items-start gap-3"><span className="mt-0.5 text-destructive">!</span><div className="flex-1"><p className="font-semibold text-foreground">تعذر تحميل المواد</p><p className="mt-1 text-sm text-muted-foreground">تعذر الوصول إلى بيانات المنصة. حاول مرة أخرى.</p></div><button type="button" onClick={() => materialsQuery.refetch()} className="text-sm font-semibold text-primary underline underline-offset-4" data-testid="button-retry">إعادة المحاولة</button></div></div></div>}
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
  </main>;
}

export default PrintEstimatorPage;
