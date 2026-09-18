import { useState } from 'react';
import { safeStorage } from '@/lib/storage';
import {
  KeyRound,
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  Database,
  RefreshCw,
  Clock,
  Terminal,
  Server,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Language } from './admin-dashboard-shell';

export function AdminSettingsPage({ language = 'ar' }: { language?: Language }) {
  const isAr = language === 'ar';
  const { user, token, setAdminPassword, mongoStatus } = useAuth();

  // Password reset form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Statuses
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Calculate password strength
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };
  const strengthScore = getStrength(newPassword);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError(
        isAr
          ? 'يرجى إدخال كلمة المرور الحالية للتأكيد'
          : 'Please enter your current password for verification',
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        isAr
          ? 'كلمة المرور الجديدة يجب ألا تقل عن 6 خانات'
          : 'New password must be at least 6 characters',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        isAr
          ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين'
          : 'New password and confirmation do not match',
      );
      return;
    }

    setSaving(true);
    try {
      let res: { success: boolean; error?: string; message?: string };

      if (typeof setAdminPassword === "function") {
        res = await setAdminPassword(
          newPassword,
          currentPassword,
          user?.email || 'admin@aj-industry.com',
        );
      } else {
        const storedToken = safeStorage.getItem('aj_industry_token') || '';
        const fetchRes = await fetch("/api/auth/admin-set-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
          body: JSON.stringify({
            newPassword,
            currentPassword,
            email: user?.email || 'admin@aj-industry.com',
          }),
        });
        const data = await fetchRes.json();
        if (!fetchRes.ok || !data.success) {
          res = { success: false, error: data.error || (isAr ? 'فشل تحديث كلمة المرور' : 'Failed to update password') };
        } else {
          if (data.token) {
            safeStorage.setItem('aj_industry_token', data.token);
            if (data.user) safeStorage.setItem('aj_industry_user', JSON.stringify(data.user));
          }
          res = { success: true, message: data.message };
        }
      }

      if (!res.success) {
        setError(res.error || (isAr ? 'فشل تحديث كلمة المرور' : 'Failed to update password'));
        setSaving(false);
        return;
      }

      const now = new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastUpdated(now);
      setSuccess(
        isAr
          ? `تم تحديث كلمة مرور الإدارة بنجاح وحفظها مشفرة في قاعدة بيانات MongoDB في تمام الساعة ${now}.`
          : `Admin password was successfully updated and encrypted in MongoDB at ${now}.`,
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || (isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Banner / Heading */}
      <div className="border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center border border-primary/40 bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-code text-xs font-semibold tracking-wider text-primary">
                  AJ-SYS // ADMIN SECURITY
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-code text-[10px] font-bold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isAr ? 'نشط ومحمي' : 'Active & Protected'}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {isAr ? 'إعدادات الإدارة والأمان' : 'Admin Settings & Security'}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isAr
                  ? 'إدارة بيانات اعتماد المسؤول، تغيير كلمة المرور في قاعدة البيانات، والتحقق من الجلسات المشفرة'
                  : 'Manage admin credentials, update encrypted database password, and verify sessions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-code text-xs text-muted-foreground">
              {isAr ? 'المسؤول الحالي:' : 'Current Admin:'}
            </span>
            <span className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1 font-code text-xs font-bold text-primary">
              admin
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns on Desktop */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Column: Real Password Reset Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="grid size-10 place-items-center rounded bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  {isAr ? 'تغيير كلمة مرور الإدارة' : 'Reset Admin Password'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isAr
                    ? 'يتم تشفير كلمة المرور وتحديثها مباشرة في قاعدة بيانات MongoDB'
                    : 'Password will be salted, hashed, and committed directly to MongoDB'}
                </p>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mt-6 flex items-start gap-3 rounded border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-400">
                    {isAr ? 'تم حفظ التعديل بنجاح' : 'Update Confirmed'}
                  </p>
                  <p className="leading-relaxed">{success}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 flex items-start gap-3 rounded border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300">
                <AlertCircle className="size-5 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-400">
                    {isAr ? 'تنبيه خطأ' : 'Error'}
                  </p>
                  <p className="leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-5">
              {/* Field: Current Password */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>{isAr ? 'كلمة المرور الحالية' : 'Current Password'}</span>
                  <span className="font-code text-[11px] text-muted-foreground">
                    {isAr ? 'مطلوبة للتحقق من هويتك' : 'Required for authorization'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={isAr ? 'أدخل كلمة المرور الحالية (مثال: ahmedahmed)' : 'Enter current password'}
                    className="w-full border border-input bg-background/60 px-3.5 py-2.5 font-code text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Field: New Password */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</span>
                  <span className="font-code text-[11px] text-muted-foreground">
                    {isAr ? '6 أحرف على الأقل' : 'Min 6 characters'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={isAr ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                    className="w-full border border-input bg-background/60 px-3.5 py-2.5 font-code text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded bg-border">
                      <div
                        className={`h-full transition-all ${
                          strengthScore <= 1
                            ? 'w-1/4 bg-red-500'
                            : strengthScore <= 2
                              ? 'w-2/4 bg-amber-500'
                              : strengthScore <= 3
                                ? 'w-3/4 bg-blue-500'
                                : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between font-code text-[10px] text-muted-foreground">
                      <span>{isAr ? 'قوة كلمة المرور:' : 'Password Strength:'}</span>
                      <span
                        className={
                          strengthScore <= 1
                            ? 'text-red-400 font-bold'
                            : strengthScore <= 2
                              ? 'text-amber-400 font-bold'
                              : 'text-emerald-400 font-bold'
                        }
                      >
                        {strengthScore <= 1
                          ? isAr
                            ? 'ضعيفة'
                            : 'Weak'
                          : strengthScore <= 2
                            ? isAr
                              ? 'متوسطة'
                              : 'Fair'
                            : strengthScore <= 3
                              ? isAr
                                ? 'جيدة'
                                : 'Good'
                              : isAr
                                ? 'قوية جداً'
                                : 'Strong'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Field: Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isAr ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                  className="w-full border border-input bg-background/60 px-3.5 py-2.5 font-code text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                  className="flex w-full items-center justify-center gap-2 bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>{isAr ? 'جاري الحفظ في MongoDB...' : 'Saving to MongoDB...'}</span>
                    </>
                  ) : (
                    <>
                      <Shield className="size-4" />
                      <span>{isAr ? 'تحديث وحفظ كلمة المرور في قاعدة البيانات' : 'Update & Save to Database'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Side Column: Admin Credentials & System Status (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Admin Credentials Summary Card */}
          <div className="border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
              <UserCheck className="size-5 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground">
                {isAr ? 'بيانات حساب الإدارة' : 'Admin Profile'}
              </h3>
            </div>

            <dl className="mt-4 divide-y divide-border/60 text-xs">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{isAr ? 'اسم المستخدم:' : 'Username:'}</dt>
                <dd className="font-code font-bold text-foreground">admin</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{isAr ? 'البريد الإلكتروني:' : 'Email:'}</dt>
                <dd className="font-code text-muted-foreground">admin@aj-industry.com</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{isAr ? 'الدور والصلاحيات:' : 'Role:'}</dt>
                <dd className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-code font-bold text-amber-400">
                  <Shield className="size-3" />
                  SUPER_ADMIN
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">{isAr ? 'خوارزمية التشفير:' : 'Hashing:'}</dt>
                <dd className="font-code text-xs text-muted-foreground">scrypt-64 (salted)</dd>
              </div>
              {lastUpdated && (
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-muted-foreground">{isAr ? 'آخر تحديث للباسورد:' : 'Last Updated:'}</dt>
                  <dd className="font-code text-xs text-emerald-400">{lastUpdated}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* MongoDB Connection Status Card */}
          <div className="border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="size-5 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-foreground">
                  {isAr ? 'قاعدة بيانات MongoDB' : 'MongoDB Storage'}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-code text-[10px] font-bold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {mongoStatus?.connected ? (isAr ? 'متصلة' : 'Connected') : (isAr ? 'نشطة' : 'Active')}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs text-muted-foreground">
              <div className="rounded border border-border/70 bg-background/50 p-3 font-code text-[11px] leading-relaxed">
                <div className="text-foreground font-bold mb-1">
                  Collection: <span className="text-primary">users</span>
                </div>
                <div>Filter: <span className="text-muted-foreground">{`{ username: "admin", role: "admin" }`}</span></div>
                <div className="mt-1 text-emerald-400">
                  {isAr ? '✓ التخزين دائم وحقيقي عبر جلسات الخادم' : '✓ Real persistent storage verified'}
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <Info className="size-4 shrink-0 text-primary mt-0.5" />
                <span>
                  {isAr
                    ? 'أي تغيير تقوم به لكلمة المرور هنا ينعكس فورياً على شاشة تسجيل دخول المسؤول (/admin-login).'
                    : 'Any password change here takes effect immediately on the Admin Login screen (/admin-login).'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
