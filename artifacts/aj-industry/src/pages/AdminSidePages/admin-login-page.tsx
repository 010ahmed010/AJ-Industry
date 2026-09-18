import { useState } from "react";
import { Link, useLocation } from "wouter";
import { safeStorage } from "@/lib/storage";
import {
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Loader2,
  LogOut,
  User,
  Sparkles,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { isSignedIn, user, signOut, adminLogin } = useAuth();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setError("يرجى إدخال اسم المستخدم / Username is required");
      return;
    }

    if (!password) {
      setError("يرجى إدخال كلمة المرور / Password is required");
      return;
    }

    setLoading(true);

    try {
      let res: { success: boolean; error?: string; user?: any };

      if (typeof adminLogin === "function") {
        res = await adminLogin(username.trim(), password);
      } else {
        const fetchRes = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await fetchRes.json();
        if (!fetchRes.ok || !data.success) {
          res = { success: false, error: data.error || "اسم المستخدم أو كلمة المرور غير صحيحة" };
        } else {
          safeStorage.setItem("aj_industry_token", data.token);
          if (data.user) safeStorage.setItem("aj_industry_user", JSON.stringify(data.user));
          res = { success: true, user: data.user };
        }
      }

      if (!res.success) {
        setError(res.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }
      setSuccessMessage("تم التحقق بنجاح! جاري التوجيه إلى لوحة الإدارة...");
      setTimeout(() => {
        window.location.href = "/admin-aj-industry";
      }, 350);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء محاولة تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername("admin");
    setPassword("ahmedahmed");
    setError(null);
  };

  return (
    <div
      className="relative min-h-[100dvh] bg-[#071126] text-[#edf4ff] selection:bg-primary selection:text-[#071126]"
      dir="rtl"
    >
      {/* Background industrial grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(#2a4164 1px, transparent 1px), linear-gradient(to right, #2a4164 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Header / Bar */}
      <header className="relative z-10 border-b border-[#2a4164]/70 bg-[#0b172d]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center border border-primary/40 bg-primary/10 font-code text-xs font-bold text-primary">
              AJ
            </span>
            <div>
              <span className="block font-display text-sm font-bold tracking-tight">AJ—INDUSTRY</span>
              <span className="block font-code text-[9px] tracking-widest text-primary">
                ADMIN CONTROL CONSOLE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[#9aabc4] transition-colors hover:text-[#edf4ff]"
            >
              <ArrowRight className="size-3.5" />
              <span>الموقع الرئيسي</span>
            </Link>
            <span className="text-[#2a4164]">|</span>
            <Link
              href="/sign-in"
              className="flex items-center gap-1.5 text-primary transition-colors hover:underline"
            >
              <span>بوابة العملاء</span>
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-3.5 py-6 sm:px-4 sm:py-12">
        <div className="w-full max-w-md">
          {/* Top Badge */}
          <div className="mb-4 flex items-center justify-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-code text-[10px] sm:text-[11px] font-semibold text-amber-400">
              <Shield className="size-3 shrink-0" />
              <span>منطقة إدارية مقيدة — لمالك الموقع والمسؤولين فقط</span>
            </span>
          </div>

          {/* Already Signed In as Admin Banner */}
          {isSignedIn && user?.role === "admin" && (
            <div className="mb-6 rounded-xl border border-emerald-500/40 bg-[#0b172d] p-4 sm:p-5 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <UserCheck className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#edf4ff]">أنت مسجل حالياً كمسؤول النظام</p>
                  <p className="truncate font-code text-xs text-[#9aabc4]">{user.email || user.name}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocation("/admin-aj-industry")}
                  className="flex-1 rounded-md bg-primary py-2.5 text-center text-xs font-bold text-[#071126] transition-opacity hover:opacity-90"
                >
                  الدخول المباشر إلى لوحة الإدارة &larr;
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 rounded-md border border-[#2a4164] bg-[#101f37] px-3 py-2 text-xs font-semibold text-[#9aabc4] hover:border-red-500/50 hover:text-red-400"
                >
                  <LogOut className="size-3.5" />
                  خروج
                </button>
              </div>
            </div>
          )}

          {/* Login Card */}
          <div className="rounded-2xl border border-[#2a4164] bg-[#0b172d] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
            {/* Title */}
            <div className="text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
                <KeyRound className="size-6" />
              </div>
              <h1 className="mt-3 font-display text-xl font-bold text-[#edf4ff]">
                دخول لوحة إدارة AJ
              </h1>
              <p className="mt-1 text-xs text-[#9aabc4]">
                يرجى إدخال اسم المستخدم وكلمة المرور للوصول إلى لوحة التحكم
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {successMessage && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-400" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Form: Username and Password */}
            <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
              {/* Field 1: Username */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#edf4ff]">
                  <span>اسم المستخدم / Username</span>
                  <span className="font-code text-[11px] text-primary font-bold">admin</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 pe-10 font-code text-sm text-[#edf4ff] outline-none transition-colors focus:border-primary"
                    placeholder="admin"
                    autoComplete="username"
                  />
                  <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#9aabc4]">
                    <User className="size-4" />
                  </div>
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <label className="font-semibold text-[#edf4ff]">كلمة المرور / Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#9aabc4] hover:text-primary text-xs"
                  >
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 pe-10 font-code text-sm text-[#edf4ff] outline-none transition-colors focus:border-primary"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-[#9aabc4] hover:text-[#edf4ff]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Seed Credentials Quick-Fill Badge */}
              <div className="rounded-lg border border-[#2a4164]/80 bg-[#101f37]/70 p-3 text-xs">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <span className="block text-[11px] font-medium text-[#9aabc4]">
                      بيانات الدخول الافتراضية:
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-code text-xs">
                      <span className="whitespace-nowrap">
                        المستخدم: <strong className="font-bold text-primary">admin</strong>
                      </span>
                      <span className="text-[#9aabc4]/40">•</span>
                      <span className="whitespace-nowrap">
                        كلمة السر: <strong className="font-bold text-primary">ahmedahmed</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="flex shrink-0 items-center justify-center self-stretch sm:self-auto rounded bg-primary/20 px-3 py-1.5 font-code text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-[#071126] text-center"
                  >
                    تعبئة تلقائية
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary font-bold text-[#071126] transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>جاري التحقق من الاعتماد...</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    <span>تسجيل الدخول إلى لوحة الإدارة</span>
                  </>
                )}
              </button>
            </form>

            {/* Security Notice: Password Reset is in Admin Settings */}
            <div className="mt-6 border-t border-[#2a4164]/60 pt-4 text-center">
              <div className="flex items-start justify-center gap-2 text-[11px] text-[#9aabc4]">
                <Info className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span className="leading-relaxed">
                  لأسباب أمنية وحماية للنظام، يتم تغيير أو إعادة تعيين كلمة المرور حصرياً من خلال صفحة{" "}
                  <strong className="text-foreground">"الإعدادات والأمان"</strong> داخل لوحة تحكم الإدارة بعد تسجيل الدخول.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
