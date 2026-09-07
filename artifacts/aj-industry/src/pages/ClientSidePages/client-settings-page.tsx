import { type FormEvent, useEffect, useState } from 'react';
import { Bell, Check, Globe2, KeyRound, LockKeyhole, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import {
  clientText,
  type ClientLanguage,
  PageIntro,
  Panel,
  PanelHeader,
  Tag,
  useClientDashboard,
} from './client-dashboard-shell';

type NotificationState = {
  project: boolean;
  support: boolean;
  newsletter: boolean;
};

const defaultNotifications: NotificationState = { project: true, support: true, newsletter: false };

export function ClientSettingsPage() {
  const { language, setLanguage, profile, saveProfile } = useClientDashboard();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [company, setCompany] = useState(profile.company);
  const [notifications, setNotifications] = useState<NotificationState>(() => {
    try {
      return { ...defaultNotifications, ...JSON.parse(localStorage.getItem('aj-client-notifications') || '{}') };
    } catch {
      return defaultNotifications;
    }
  });
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    setCompany(profile.company);
  }, [profile]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProfile({ name: name.trim() || profile.name, email: email.trim() || profile.email, company: company.trim() || profile.company });
    localStorage.setItem('aj-client-notifications', JSON.stringify(notifications));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2800);
  };

  const toggleNotification = (key: keyof NotificationState) => setNotifications((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageIntro
        code="ACCOUNT / 04 — SETTINGS"
        title={clientText(language, 'إعدادات الحساب', 'Account settings')}
        description={clientText(language, 'اضبط معلومات ملفك، طريقة التواصل، وتفضيلات مساحة العمل.', 'Tune your profile, communication channels, and workspace preferences.')}
        action={saved ? <Tag tone="green"><Check className="me-1 size-3" />{clientText(language, 'تم الحفظ', 'SAVED')}</Tag> : <Tag tone="muted">SA-042 / CLIENT</Tag>}
      />

      <form onSubmit={submit} className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="grid gap-4">
          <Panel>
            <PanelHeader eyebrow="PROFILE / IDENTITY" title={clientText(language, 'ملف العميل', 'Client profile')} action={<UserRound className="size-4 text-primary" />} />
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'الاسم الكامل', 'Full name')}</span><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary" /></label>
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'الشركة', 'Company')}</span><input value={company} onChange={(event) => setCompany(event.target.value)} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary" /></label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2"><span>{clientText(language, 'البريد الإلكتروني', 'Email address')}</span><span className="relative"><Mail className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full border border-input bg-background/60 px-11 text-sm outline-none focus:border-primary" /></span></label>
              <div className="flex items-center gap-3 border border-border/70 bg-secondary/20 p-4 sm:col-span-2"><ShieldCheck className="size-4 shrink-0 text-accent" /><p className="text-xs leading-6 text-muted-foreground">{clientText(language, 'بياناتك مرتبطة بملف العميل SA-042 وتستخدم فقط لتنسيق مشاريع AJ.', 'Your details are tied to client profile SA-042 and used only to coordinate AJ projects.')}</p></div>
            </div>
          </Panel>
          <Panel>
            <PanelHeader eyebrow="SECURITY / ACCESS" title={clientText(language, 'الوصول والأمان', 'Access & security')} action={<LockKeyhole className="size-4 text-primary" />} />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-sm font-semibold">{clientText(language, 'كلمة المرور', 'Password')}</p><p className="mt-2 text-xs text-muted-foreground">{clientText(language, 'آخر تحديث قبل 34 يوماً', 'Last updated 34 days ago')}</p></div><button type="button" onClick={() => { setResetSent(true); window.setTimeout(() => setResetSent(false), 4000); }} className="inline-flex h-10 items-center justify-center gap-2 border border-border px-4 text-xs font-bold transition-colors hover:border-primary hover:text-primary"><KeyRound className="size-3.5" />{resetSent ? clientText(language, 'تم إرسال الرابط', 'RESET LINK SENT') : clientText(language, 'إرسال رابط إعادة التعيين', 'Send reset link')}</button></div>
          </Panel>
        </div>
        <div className="grid content-start gap-4">
          <Panel>
            <PanelHeader eyebrow="PREFERENCES / LOCALE" title={clientText(language, 'اللغة والتفضيلات', 'Language & preferences')} action={<Globe2 className="size-4 text-primary" />} />
            <div className="grid gap-5 p-5 sm:p-6">
              <label className="grid gap-2 text-sm font-semibold"><span>{clientText(language, 'لغة لوحة التحكم', 'Dashboard language')}</span><select value={language} onChange={(event) => setLanguage(event.target.value as ClientLanguage)} className="h-12 border border-input bg-background/60 px-4 text-sm outline-none focus:border-primary"><option value="ar">العربية — Arabic</option><option value="en">English — الإنجليزية</option></select></label>
              <p className="font-code text-[9px] leading-5 text-muted-foreground">{clientText(language, 'تتغير المحاذاة واللغة فوراً. احفظ بقية التعديلات من الزر أدناه.', 'Alignment and language update instantly. Save other changes with the button below.')}</p>
            </div>
          </Panel>
          <Panel>
            <PanelHeader eyebrow="NOTIFICATIONS / SIGNALS" title={clientText(language, 'الإشعارات', 'Notifications')} action={<Bell className="size-4 text-primary" />} />
            <div className="divide-y divide-border/70">
              {[
                { key: 'project' as const, title: clientText(language, 'تحديثات المشروع', 'Project updates'), body: clientText(language, 'تقدم الطباعة والتسليم والملفات الجديدة', 'Print progress, delivery, and new files') },
                { key: 'support' as const, title: clientText(language, 'رسائل الدعم', 'Support messages'), body: clientText(language, 'ردود المهندسين وطلبات المعلومات', 'Engineer replies and information requests') },
                { key: 'newsletter' as const, title: clientText(language, 'إشارات الصناعة', 'Industry signals'), body: clientText(language, 'مواد وقراءات مختارة من AJ', 'Selected AJ notes and reading') },
              ].map((item) => <label key={item.key} className="flex cursor-pointer items-center gap-3 p-5 transition-colors hover:bg-secondary/25"><span className={`grid size-5 shrink-0 place-items-center border transition-colors ${notifications[item.key] ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}>{notifications[item.key] && <Check className="size-3" />}<input type="checkbox" checked={notifications[item.key]} onChange={() => toggleNotification(item.key)} className="sr-only" /></span><span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.body}</span></span></label>)}
            </div>
          </Panel>
          <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"><Save className="size-4" />{clientText(language, 'حفظ إعدادات الحساب', 'Save account settings')}</button>
        </div>
      </form>
      <div className="mt-5 flex items-center gap-3 border border-border/70 bg-secondary/20 p-4 text-xs text-muted-foreground"><span className="font-code text-[9px] text-primary">LOCAL / STATE</span>{clientText(language, 'يتم حفظ هذه التفضيلات على هذا الجهاز حتى تتوفر مزامنة الحساب.', 'These preferences are saved on this device until account sync is available.')}</div>
    </div>
  );
}

export default ClientSettingsPage;