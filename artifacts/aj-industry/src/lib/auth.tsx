import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ClerkProvider as RealClerkProvider,
  useAuth as useRealAuth,
  useClerk as useRealClerk,
  SignIn as RealSignIn,
  SignUp as RealSignUp,
} from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Database, ShieldCheck, UserCheck, LogIn, UserPlus, KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { safeStorage } from "./storage";

export const CLERK_PUBLISHABLE_KEY = (
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ""
).trim();

// A valid Clerk key starts with pk_
export const isClerkConfigured = Boolean(
  CLERK_PUBLISHABLE_KEY &&
  CLERK_PUBLISHABLE_KEY.startsWith("pk_")
);

const ClerkActiveContext = createContext<boolean>(false);

export function ClerkActiveProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkActiveContext.Provider value={true}>
      {children}
    </ClerkActiveContext.Provider>
  );
}

export interface MongoUser {
  id: string;
  username?: string;
  email: string;
  name: string;
  company: string;
  role: "client" | "admin";
}

interface MongoAuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: MongoUser | null;
  token: string | null;
  mongoStatus: { configured: boolean; connected: boolean; isFallback: boolean; dbName: string } | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: MongoUser }>;
  adminLogin: (identifierOrPassword: string, maybePassword?: string) => Promise<{ success: boolean; error?: string; user?: MongoUser }>;
  setAdminPassword: (newPassword: string, currentPassword?: string, email?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  register: (name: string, email: string, password: string, company?: string) => Promise<{ success: boolean; error?: string }>;
  demoLogin: (role: "client" | "admin") => Promise<void>;
  signOut: () => Promise<void>;
  addListener: (callback: (data: { user: any }) => void) => () => void;
  setSignedIn: (signedIn: boolean) => void;
}

const STORAGE_KEY = "aj_industry_token";
const USER_STORAGE_KEY = "aj_industry_user";

const MongoAuthContext = createContext<MongoAuthContextValue>({
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  user: null,
  token: null,
  mongoStatus: null,
  login: async () => ({ success: false }),
  adminLogin: async () => ({ success: false }),
  setAdminPassword: async () => ({ success: false }),
  register: async () => ({ success: false }),
  demoLogin: async () => {},
  signOut: async () => {},
  addListener: () => () => {},
  setSignedIn: () => {},
});

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return safeStorage.getItem(STORAGE_KEY);
  });
  const [user, setUser] = useState<MongoUser | null>(() => {
    try {
      const cached = safeStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.role === 'admin' && (!parsed.name || parsed.name.includes('المهندس المسؤول') || parsed.name.includes('AJ Admin') || parsed.name.includes('مدير النظام'))) {
          parsed.name = 'المدير';
          safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {}
    return null;
  });
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => {
    return Boolean(safeStorage.getItem(STORAGE_KEY));
  });
  const [isLoaded, setIsLoaded] = useState(true);
  const [mongoStatus, setMongoStatus] = useState<{ configured: boolean; connected: boolean; isFallback: boolean; dbName: string } | null>(null);

  // Sync token to API client
  useEffect(() => {
    setAuthTokenGetter(async () => token);
  }, [token]);

  // Check Mongo status & validate session on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const statusRes = await fetch("/api/auth/mongo-status");
        if (statusRes.ok && mounted) {
          const status = await statusRes.json();
          setMongoStatus(status);
        }
      } catch {}

      const existingToken = safeStorage.getItem(STORAGE_KEY);
      if (existingToken) {
        try {
          const meRes = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${existingToken}` },
          });
          if (meRes.ok && mounted) {
            const data = await meRes.json();
            if (data.user) {
              if (data.user.role === 'admin') {
                data.user.name = 'المدير';
              }
              setUser(data.user);
              setIsSignedIn(true);
              setToken(existingToken);
              safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
              return;
            }
          } else if (meRes.status === 401 && mounted) {
            safeStorage.removeItem(STORAGE_KEY);
            safeStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
            setToken(null);
            setIsSignedIn(false);
          }
        } catch {}
      } else if (mounted) {
        setIsSignedIn(false);
        setUser(null);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "فشل تسجيل الدخول" };
      }
      setToken(data.token);
      setUser(data.user);
      setIsSignedIn(true);
      safeStorage.setItem(STORAGE_KEY, data.token);
      safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ أثناء الاتصال بالخادم" };
    }
  };

  const adminLogin = async (identifierOrPassword: string, maybePassword?: string) => {
    try {
      const username = maybePassword !== undefined ? identifierOrPassword : "admin";
      const password = maybePassword !== undefined ? maybePassword : identifierOrPassword;
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "فشل تسجيل دخول الإدارة" };
      }
      if (data.user) {
        if (data.user.role === 'admin') data.user.name = 'المدير';
      }
      setToken(data.token);
      setUser(data.user);
      setIsSignedIn(true);
      safeStorage.setItem(STORAGE_KEY, data.token);
      safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ أثناء الاتصال بالخادم" };
    }
  };

  const setAdminPassword = async (newPassword: string, currentPassword?: string, email?: string) => {
    try {
      const res = await fetch("/api/auth/admin-set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newPassword, currentPassword, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "فشل تحديث كلمة مرور الإدارة" };
      }
      if (data.token) {
        setToken(data.token);
        if (data.user) {
          setUser(data.user);
        }
        setIsSignedIn(true);
        safeStorage.setItem(STORAGE_KEY, data.token);
        if (data.user) safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ أثناء الاتصال بالخادم" };
    }
  };

  const register = async (name: string, email: string, password: string, company?: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "فشل إنشاء الحساب" };
      }
      setToken(data.token);
      setUser(data.user);
      setIsSignedIn(true);
      safeStorage.setItem(STORAGE_KEY, data.token);
      safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ أثناء إنشاء الحساب" };
    }
  };

  const demoLogin = async (role: "client" | "admin") => {
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        setIsSignedIn(true);
        safeStorage.setItem(STORAGE_KEY, data.token);
        safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      }
    } catch {}
  };

  const signOut = async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    safeStorage.removeItem(STORAGE_KEY);
    safeStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsSignedIn(false);
  };

  const value: MongoAuthContextValue = {
    isLoaded,
    isSignedIn,
    userId: user?.id ?? null,
    user,
    token,
    mongoStatus,
    login,
    adminLogin,
    setAdminPassword,
    register,
    demoLogin,
    signOut,
    addListener: () => () => {},
    setSignedIn: setIsSignedIn,
  };

  return (
    <MongoAuthContext.Provider value={value}>
      {children}
    </MongoAuthContext.Provider>
  );
}

function useClerkAndMongoAuth() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const mongoCtx = useContext(MongoAuthContext);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkAuth = useRealAuth();

  // If user is authenticated in MongoDB (as admin or client), MongoDB auth takes precedence
  if (mongoCtx.isSignedIn && mongoCtx.user) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: mongoCtx.userId,
      user: mongoCtx.user,
      role: mongoCtx.user.role,
      sessionId: mongoCtx.token || "mongo_session",
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      has: () => true,
      getToken: async () => mongoCtx.token,
      adminLogin: mongoCtx.adminLogin,
      setAdminPassword: mongoCtx.setAdminPassword,
      login: mongoCtx.login,
      register: mongoCtx.register,
      demoLogin: mongoCtx.demoLogin,
      signOut: mongoCtx.signOut,
    };
  }

  // If signed in via Clerk
  if (clerkAuth.isSignedIn) {
    return {
      ...clerkAuth,
      user: mongoCtx.user || {
        id: clerkAuth.userId || "clerk_client",
        name: "عميل AJ للتصنيع",
        email: "client@aj-industry.com",
        company: "AJ Partner",
        role: "client" as const,
      },
      role: "client" as const,
      adminLogin: mongoCtx.adminLogin,
      setAdminPassword: mongoCtx.setAdminPassword,
      login: mongoCtx.login,
      register: mongoCtx.register,
      demoLogin: mongoCtx.demoLogin,
      signOut: async () => {
        await mongoCtx.signOut();
        try {
          if (clerkAuth.signOut) await clerkAuth.signOut();
        } catch {}
      },
    };
  }

  // Not signed in
  return {
    isLoaded: clerkAuth.isLoaded,
    isSignedIn: false,
    userId: null,
    user: null,
    role: null,
    sessionId: null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: () => false,
    getToken: async () => null,
    adminLogin: mongoCtx.adminLogin,
    setAdminPassword: mongoCtx.setAdminPassword,
    login: mongoCtx.login,
    register: mongoCtx.register,
    demoLogin: mongoCtx.demoLogin,
    signOut: mongoCtx.signOut,
  };
}

function useMongoOnlyAuth() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ctx = useContext(MongoAuthContext);
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    userId: ctx.userId,
    user: ctx.user,
    role: ctx.user?.role ?? null,
    sessionId: ctx.isSignedIn ? (ctx.token || "mongo_session") : null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: () => true,
    getToken: async () => ctx.token || "demo_token",
    adminLogin: ctx.adminLogin,
    setAdminPassword: ctx.setAdminPassword,
    login: ctx.login,
    register: ctx.register,
    demoLogin: ctx.demoLogin,
    signOut: ctx.signOut,
  };
}

export function useAuth() {
  const isClerkActive = useContext(ClerkActiveContext);
  if (isClerkActive && isClerkConfigured) {
    return useClerkAndMongoAuth();
  }
  return useMongoOnlyAuth();
}

function useClerkAndMongoClerk() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const mongoCtx = useContext(MongoAuthContext);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const realClerk = useRealClerk();

  return {
    signOut: async (options?: any) => {
      await mongoCtx.signOut();
      try {
        await realClerk.signOut(options);
      } catch {}
    },
    addListener: (cb: any) => realClerk.addListener(cb),
    user: mongoCtx.user
      ? {
          id: mongoCtx.user.id,
          fullName: mongoCtx.user.name,
          firstName: mongoCtx.user.name.split(" ")[0] || mongoCtx.user.name,
          lastName: mongoCtx.user.name.split(" ").slice(1).join(" ") || "",
          primaryEmailAddress: { emailAddress: mongoCtx.user.email },
        }
      : realClerk.user,
    openSignIn: () => realClerk.openSignIn?.(),
    openSignUp: () => realClerk.openSignUp?.(),
  };
}

function useMongoOnlyClerk() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ctx = useContext(MongoAuthContext);
  return {
    signOut: ctx.signOut,
    addListener: ctx.addListener,
    user: ctx.user
      ? {
          id: ctx.user.id,
          fullName: ctx.user.name,
          firstName: ctx.user.name.split(" ")[0] || ctx.user.name,
          lastName: ctx.user.name.split(" ").slice(1).join(" ") || "",
          primaryEmailAddress: { emailAddress: ctx.user.email },
        }
      : ctx.isSignedIn
      ? {
          id: "demo_client_user",
          fullName: "عميل تجريبي / Demo Client",
          firstName: "Demo",
          lastName: "Client",
          primaryEmailAddress: { emailAddress: "client@aj-industry.com" },
        }
      : null,
    openSignIn: () => ctx.setSignedIn(true),
    openSignUp: () => ctx.setSignedIn(true),
  };
}

export function useClerk() {
  const isClerkActive = useContext(ClerkActiveContext);
  if (isClerkActive && isClerkConfigured) {
    return useClerkAndMongoClerk();
  }
  return useMongoOnlyClerk();
}

export function SignIn(props: any) {
  return <RealSignIn {...props} />;
}

export function SignUp(props: any) {
  return <RealSignUp {...props} />;
}

function AuthCard({ defaultTab = "signin" }: { defaultTab: "signin" | "register" | "demo" }) {
  const [tab, setTab] = useState<"signin" | "register" | "demo">(defaultTab);
  const { login, register, demoLogin, mongoStatus, isSignedIn, user } = useContext(MongoAuthContext);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "خطأ في تسجيل الدخول");
    } else {
      setSuccessMsg("تم تسجيل الدخول بنجاح! جاري التوجيه...");
      setTimeout(() => {
        window.location.href = res.user?.role === "admin" ? "/admin-aj-industry" : "/client";
      }, 500);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await register(name, email, password, company);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "فشل تسجيل الحساب");
    } else {
      setSuccessMsg("تم إنشاء الحساب بنجاح في قاعدة البيانات! جاري التوجيه...");
      setTimeout(() => {
        window.location.href = "/client";
      }, 600);
    }
  };

  const handleQuickDemo = async (role: "client" | "admin") => {
    setLoading(true);
    await demoLogin(role);
    setLoading(false);
    setSuccessMsg(`تم الدخول بنجاح كـ ${role === "admin" ? "مدير النظام" : "عميل"}!`);
    setTimeout(() => {
      window.location.href = role === "admin" ? "/admin-aj-industry" : "/client";
    }, 500);
  };

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#2a4164] bg-[#0b1528] p-6 shadow-2xl sm:p-8">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-[#2a4164]/60 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center border border-primary/50 bg-primary/10 font-code text-sm font-bold text-primary">
            AJ
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-[#edf4ff]">AJ—INDUSTRY</h2>
            <p className="font-code text-[10px] tracking-wider text-primary">بوابة العملاء / CLIENT WORKSPACE</p>
          </div>
        </div>

        {/* Live Database status pill */}
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-code ${
            mongoStatus?.connected
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/40 bg-amber-500/10 text-amber-400"
          }`}
          title={mongoStatus?.connected ? `Connected to ${mongoStatus.dbName}` : "In-memory database"}
        >
          <Database className="size-3" />
          <span>{mongoStatus?.connected ? "MongoDB Atlas" : "Local DB"}</span>
        </div>
      </div>

      {/* Notice */}
      <div className="mt-3 rounded border border-primary/20 bg-primary/5 p-2.5 text-xs text-[#9aabc4]">
        مساحة مخصصة للعملاء لمتابعة طلبات التصنيع، عروض الأسعار، والمحادثات الهندسية.
      </div>

      {/* Tabs */}
      <div className="mt-6 flex rounded-lg border border-[#2a4164] bg-[#101f37] p-1 text-xs">
        <button
          type="button"
          onClick={() => { setTab("signin"); setError(null); }}
          className={`flex-1 rounded-md py-2 text-center font-semibold transition-colors ${
            tab === "signin"
              ? "bg-primary text-[#071126]"
              : "text-[#9aabc4] hover:text-[#edf4ff]"
          }`}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => { setTab("register"); setError(null); }}
          className={`flex-1 rounded-md py-2 text-center font-semibold transition-colors ${
            tab === "register"
              ? "bg-primary text-[#071126]"
              : "text-[#9aabc4] hover:text-[#edf4ff]"
          }`}
        >
          حساب جديد
        </button>
        <button
          type="button"
          onClick={() => { setTab("demo"); setError(null); }}
          className={`flex-1 rounded-md py-2 text-center font-semibold transition-colors ${
            tab === "demo"
              ? "bg-primary text-[#071126]"
              : "text-[#9aabc4] hover:text-[#edf4ff]"
          }`}
        >
          دخول سريع
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#7b363d] bg-[#321a25] p-3 text-xs text-[#ff746c]">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active User Notice if already signed in */}
      {isSignedIn && user && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-[#9aabc4]">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            <span>مسجل كـ: <strong className="text-[#edf4ff]">{user.name}</strong> ({user.role})</span>
          </div>
          <a
            href={user.role === "admin" ? "/admin-aj-industry" : "/client"}
            className="font-code text-[11px] font-bold text-primary hover:underline"
          >
            فتح اللوحة &larr;
          </a>
        </div>
      )}

      {/* Sign In Form */}
      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#edf4ff]">البريد الإلكتروني / Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@aj-industry.com"
              className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 text-sm text-[#edf4ff] placeholder-[#9aabc4]/50 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#edf4ff]">كلمة المرور / Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 text-sm text-[#edf4ff] placeholder-[#9aabc4]/50 outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary font-bold text-[#071126] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            تسجيل الدخول
          </button>
        </form>
      )}

      {/* Register Form */}
      {tab === "register" && (
        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#edf4ff]">الاسم الكامل / Full Name</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="محمد المنصور"
              className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 text-sm text-[#edf4ff] placeholder-[#9aabc4]/50 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#edf4ff]">اسم الشركة / المصنع (اختياري)</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="شركة التصنيع المتقدم"
              className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 text-sm text-[#edf4ff] placeholder-[#9aabc4]/50 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#edf4ff]">البريد الإلكتروني / Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="m.mansour@company.com"
              className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 text-sm text-[#edf4ff] placeholder-[#9aabc4]/50 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#edf4ff]">كلمة المرور / Password</label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              className="h-11 w-full rounded-md border border-[#2a4164] bg-[#101f37] px-3.5 text-sm text-[#edf4ff] placeholder-[#9aabc4]/50 outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary font-bold text-[#071126] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            إنشاء وحفظ الحساب في MongoDB
          </button>
        </form>
      )}

      {/* Quick Demo Access */}
      {tab === "demo" && (
        <div className="mt-6 space-y-3">
          <p className="text-xs leading-relaxed text-[#9aabc4]">
            يمكنك الدخول بضغطة زر واحدة لتجربة لوحة تحكم العميل:
          </p>

          <button
            type="button"
            onClick={() => handleQuickDemo("client")}
            disabled={loading}
            className="flex w-full items-center justify-between rounded-lg border border-primary/40 bg-primary/10 p-3.5 text-start transition-colors hover:border-primary hover:bg-primary/20"
          >
            <div>
              <p className="text-sm font-bold text-[#edf4ff]">دخول كعميل تجريبي (Client)</p>
              <p className="mt-0.5 font-code text-[10px] text-[#9aabc4]">client@aj-industry.com</p>
            </div>
            <span className="rounded bg-primary px-2.5 py-1 font-code text-xs font-bold text-[#071126]">
              دخول لوحة العميل &larr;
            </span>
          </button>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-[#9aabc4]">
            <p className="font-semibold text-amber-300">هل أنت مالك أو مسؤول الموقع؟</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              لوحة الإدارة مفصولة كلياً وتتطلب مصادقة خاصة بكلمة مرور الإدارة عبر الرابط المخصص.
            </p>
            <a
              href="/admin-login"
              className="mt-2 inline-flex items-center gap-1 font-code text-xs font-bold text-amber-400 hover:underline"
            >
              الانتقال لبوابة دخول الإدارة الخاصة &larr;
            </a>
          </div>
        </div>
      )}

      {/* Security Note Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#2a4164]/60 pt-4 font-code text-[10px] text-[#9aabc4]">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-primary" />
          تشفير Scrypt لكلمات المرور
        </span>
        <a href="/admin-login" className="text-primary hover:underline">
          بوابة الإدارة للمالك &rarr;
        </a>
      </div>
    </div>
  );
}
