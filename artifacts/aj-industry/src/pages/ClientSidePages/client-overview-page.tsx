import { ArrowUpRight, BriefcaseBusiness, CalendarDays, ChevronLeft, CircleCheck, Clock3, FileText, Gauge, MessageCircle, MoveUpRight, PackageCheck, Printer, SlidersHorizontal, UsersRound, Wrench } from 'lucide-react';
import { Link } from 'wouter';
import {
  clientText,
  Metric,
  PageIntro,
  Panel,
  PanelHeader,
  ProgressBar,
  QuickLink,
  Tag,
  useClientDashboard,
} from './client-dashboard-shell';

export function ClientOverviewPage() {
  const { language, profile } = useClientDashboard();
  const projectName = clientText(language, 'حامل مضخة التبريد — نسخة وظيفية', 'Cooling Pump Bracket — functional build');
  const activity = [
    { code: '14:32', title: clientText(language, 'تم اعتماد ملف STEP للمراجعة', 'STEP file approved for review'), detail: clientText(language, 'بواسطة فريق AJ الهندسي', 'By AJ engineering team'), icon: FileText },
    { code: 'أمس', title: clientText(language, 'تم تحديث مواصفات المادة', 'Material specification updated'), detail: 'PETG-CF / 0.20 mm', icon: Wrench },
    { code: '12 JUN', title: clientText(language, 'إيداع المشروع في قائمة الطباعة', 'Project queued for print'), detail: clientText(language, 'موعد التسليم المتوقع 18 يونيو', 'Estimated delivery 18 June'), icon: PackageCheck },
  ];

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageIntro
        code="CLIENT / 01 — OVERVIEW"
        title={clientText(language, `صباح الخير، ${profile.name.split(' ')[0]}`, `Good morning, ${profile.name.split(' ')[0]}`)}
        description={clientText(language, 'مساحة تشغيل مختصرة لمشاريعك، القرارات القادمة، وخط الدعم الهندسي المباشر.', 'A concise operating view of your projects, next decisions, and direct engineering support.')}
        action={<Tag tone="green">{clientText(language, 'حساب نشط', 'ACCOUNT ACTIVE')} / SA-042</Tag>}
      />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="ACTIVE PROJECT" value="01" note={clientText(language, 'مشروع قيد التنفيذ', 'Project in progress')} icon={Gauge} />
        <Metric label="NEXT MILESTONE" value="18 JUN" note={clientText(language, 'تسليم القطعة الوظيفية', 'Functional build delivery')} icon={CalendarDays} />
        <Metric label="RESPONSE WINDOW" value="04 H" note={clientText(language, 'متوسط رد فريق الدعم', 'Average support response')} icon={Clock3} />
        <Metric label="ACCOUNT SIGNAL" value="NOMINAL" note={clientText(language, 'لا توجد مهام متأخرة', 'No overdue actions')} icon={CircleCheck} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
        <Panel>
          <PanelHeader eyebrow="PROJECT / AJ-3DP-042" title={clientText(language, 'مشروعك النشط', 'Your active project')} action={<Tag>{clientText(language, 'قيد التنفيذ', 'IN PRODUCTION')}</Tag>} />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <p className="font-display text-2xl font-bold">{projectName}</p>
                <p className="mt-2 text-sm text-muted-foreground">{clientText(language, 'تطوير نموذج قابل للطباعة والاختبار داخل حجرة المحرك.', 'Print-ready development and test fit inside the engine bay.')}</p>
              </div>
              <span className="font-code text-xs text-primary">68 / 100</span>
            </div>
            <div className="mt-7"><ProgressBar value={68} /></div>
            <div className="mt-3 flex justify-between font-code text-[9px] text-muted-foreground"><span>{clientText(language, 'بدأ في 06 يونيو', 'STARTED 06 JUN')}</span><span>{clientText(language, 'المرحلة 03 من 05', 'STAGE 03 OF 05')}</span></div>
            <div className="mt-8 grid gap-3 sm:grid-cols-5">
              {[
                clientText(language, 'استلام الملف', 'Brief received'),
                clientText(language, 'مراجعة CAD', 'CAD review'),
                clientText(language, 'اعتماد المادة', 'Material lock'),
                clientText(language, 'الطباعة', 'Print run'),
                clientText(language, 'التسليم', 'Delivery'),
              ].map((item, index) => (
                <div key={item} className={`border-t pt-3 ${index < 3 ? 'border-primary' : 'border-border'}`}>
                  <div className={`mb-2 size-2 ${index < 3 ? 'bg-primary' : 'border border-border bg-background'}`} />
                  <p className={`text-xs leading-5 ${index < 3 ? 'text-foreground' : 'text-muted-foreground'}`}>{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 bg-accent" />{clientText(language, 'آخر تحديث منذ 18 دقيقة', 'Last update 18 minutes ago')}</div>
              <Link href="/client/printing" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{clientText(language, 'فتح سجل المشروع', 'Open project log')} <ArrowUpRight className="size-4" /></Link>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="NEXT ACTION / 01" title={clientText(language, 'خطوتك القادمة', 'Your next action')} />
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center border border-primary/35 bg-primary/10 text-primary"><MessageCircle className="size-5" /></span>
              <div><Tag tone="amber">{clientText(language, 'بانتظارك', 'AWAITING YOU')}</Tag><h3 className="mt-4 font-display text-xl font-bold">{clientText(language, 'اعتماد اتجاه الخامة', 'Confirm material direction')}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{clientText(language, 'راجع اختبار PETG-CF وأرسل اعتمادك قبل بدء دورة الطباعة.', 'Review the PETG-CF test and confirm before the print run begins.')}</p></div>
            </div>
            <Link href="/client/printing" className="mt-7 flex h-11 items-center justify-center gap-2 bg-primary text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">{clientText(language, 'مراجعة المشروع', 'Review project')} <MoveUpRight className="size-4" /></Link>
            <p className="mt-4 text-center font-code text-[9px] text-muted-foreground">{clientText(language, 'الموعد المقترح: 15 يونيو، 16:00', 'Suggested by 15 June, 16:00')}</p>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
        <Panel>
          <PanelHeader eyebrow="ACTIVITY / LIVE LOG" title={clientText(language, 'النشاط الأخير', 'Recent activity')} action={<Link href="/client/printing" className="font-code text-[9px] text-primary hover:underline">{clientText(language, 'كل السجل', 'VIEW LOG')}</Link>} />
          <div className="divide-y divide-border/70">
            {activity.map((item) => {
              const Icon = item.icon;
              return <div key={item.code} className="flex gap-4 px-5 py-4 sm:px-6"><span className="mt-1 grid size-8 shrink-0 place-items-center border border-border bg-secondary/50"><Icon className="size-3.5 text-primary" /></span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><p className="text-sm font-semibold">{item.title}</p><span className="font-code text-[9px] text-muted-foreground">{item.code}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div></div>;
            })}
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="ACCESS / SHORTCUTS" title={clientText(language, 'نقاط الوصول السريع', 'Quick access')} />
          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <QuickLink href="/client/consultant" code="SUPPORT / 01" title={clientText(language, 'تحدث مع مهندس', 'Talk to an engineer')} description={clientText(language, 'استشارة مباشرة عبر واتساب', 'Direct WhatsApp consultation')} icon={MessageCircle} />
            <QuickLink href="/client/printing" code="PRINT / 02" title={clientText(language, 'حجز طباعة جديدة', 'Book a new print')} description={clientText(language, 'ابدأ طلباً لمشروع جديد', 'Start a request for a new project')} icon={Printer} />
            <QuickLink href="/client/consultant" code="NETWORK / 03" title={clientText(language, 'دليل الشركاء', 'Partner directory')} description={clientText(language, 'خبراء موصى بهم من AJ', 'AJ-recommended specialists')} icon={UsersRound} />
            <QuickLink href="/client/settings" code="ACCOUNT / 04" title={clientText(language, 'بيانات الحساب', 'Account details')} description={clientText(language, 'الملف والإشعارات واللغة', 'Profile, alerts, and language')} icon={SlidersHorizontal} />
          </div>
        </Panel>
      </div>

      <div className="mt-4 flex flex-col items-start justify-between gap-4 border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-primary/40 text-primary"><BriefcaseBusiness className="size-4" /></span><div><p className="text-sm font-semibold">{clientText(language, 'تحتاج إلى إضافة نطاق جديد للمشروع؟', 'Need to extend the scope?')}</p><p className="mt-1 text-xs text-muted-foreground">{clientText(language, 'فريق AJ جاهز لمراجعة الأجزاء والخدمات المرتبطة.', 'The AJ team can review related parts and services.')}</p></div></div>
        <Link href="/client/consultant" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">{clientText(language, 'افتح تذكرة دعم', 'Open support desk')} <ChevronLeft className="size-4 rtl:rotate-180" /></Link>
      </div>
    </div>
  );
}

export default ClientOverviewPage;