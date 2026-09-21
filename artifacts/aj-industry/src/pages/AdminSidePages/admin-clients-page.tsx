import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Key,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserMinus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  adminText,
  type AdminClientProfile,
  type Language,
} from './admin-dashboard-shell';

interface DeleteClientResult {
  success: boolean;
  message: string;
  messageAr?: string;
  deletedUserId?: string;
  clerk?: {
    attempted: boolean;
    deleted: boolean;
    clerkUserId: string | null;
    message: string;
  };
  mongodb?: {
    profilesDeleted: number;
    usersDeleted: number;
    sessionsDeleted: number;
    requestsDeleted: number;
    consultationsDeleted: number;
  };
}

interface ClerkStatusResult {
  configured: boolean;
  valid: boolean;
  publishableKey?: string;
  keyPrefix?: string;
  message: string;
  messageEn?: string;
  details?: string;
}

export function AdminClientsPage({ language }: { language: Language }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientForDeletion, setSelectedClientForDeletion] = useState<AdminClientProfile | null>(null);
  const [deleteAssociatedData, setDeleteAssociatedData] = useState(true);
  const [clerkKeyInput, setClerkKeyInput] = useState('');
  const [purgeEmailInput, setPurgeEmailInput] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const { data: clients = [], isLoading, isFetching, refetch } = useQuery<AdminClientProfile[]>({
    queryKey: ['admin-clients'],
    queryFn: () => customFetch<AdminClientProfile[]>('/api/admin/clients'),
    refetchInterval: 12_000,
  });

  // Query Clerk status
  const { data: clerkStatus, isLoading: isClerkStatusLoading, refetch: refetchClerkStatus } = useQuery<ClerkStatusResult>({
    queryKey: ['admin-clerk-status'],
    queryFn: () => customFetch<ClerkStatusResult>('/api/admin/clerk-status'),
  });

  // Mutation to save/test new Clerk Secret Key
  const updateClerkKeyMutation = useMutation({
    mutationFn: async (secretKey: string) => {
      return customFetch<{ success: boolean; message: string }>('/api/admin/clerk-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-clerk-status'] });
      setFeedback({
        type: 'success',
        message: language === 'ar' ? 'تم تحديث واختبار مفتاح Clerk بنجاح!' : 'Clerk Secret Key verified and saved!',
        details: data.message,
      });
      setClerkKeyInput('');
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل التحقق من مفتاح Clerk' : 'Failed to verify Clerk key',
        details: err?.message || 'تأكد من أن المفتاح يبدأ بـ sk_test_ أو sk_live_ ومأخوذ من dashboard.clerk.com',
      });
    },
  });

  // Mutation to force purge a user by email from Clerk and MongoDB
  const purgeUserMutation = useMutation({
    mutationFn: async (email: string) => {
      return customFetch<{
        success: boolean;
        mongodbCleaned: boolean;
        clerkCleaned: boolean;
        message: string;
        target: string;
      }>('/api/admin/clerk-purge-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setFeedback({
        type: data.clerkCleaned ? 'success' : 'error',
        message: data.clerkCleaned
          ? (language === 'ar'
              ? `تم حذف وتطهير الحساب (${data.target}) بنجاح من خوادم Clerk وقاعدة بيانات الموقع!`
              : `User (${data.target}) successfully purged from Clerk cloud servers and MongoDB!`)
          : (language === 'ar'
              ? `تم تطهير الحساب من قاعدة البيانات فقط. لم يتم الحذف من Clerk السحابية.`
              : `Purged from local database only. Cloud deletion requires valid Clerk key.`),
        details: data.message,
      });
      setPurgeEmailInput('');
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل حذف الحساب' : 'Failed to purge user',
        details: err?.message,
      });
    },
  });

  // Delete mutation calling our secure DELETE /api/admin/clients/:userId endpoint
  const deleteClientMutation = useMutation({
    mutationFn: async ({ userId, deleteAssociated }: { userId: string; deleteAssociated: boolean }) => {
      return customFetch<DeleteClientResult>(`/api/admin/clients/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAssociated }),
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });

      const clientName = selectedClientForDeletion?.name || variables.userId;
      setSelectedClientForDeletion(null);

      const clerkDeleted = Boolean(data.clerk?.deleted);
      const clerkMsg = data.clerk?.message || '';

      const mongoDetails = data.mongodb
        ? `${language === 'ar' ? 'سجلات MongoDB المزالة' : 'Removed MongoDB records'}: ${data.mongodb.profilesDeleted} ملفات, ${data.mongodb.sessionsDeleted} جلسات${data.mongodb.requestsDeleted ? `, ${data.mongodb.requestsDeleted} طلبات` : ''}`
        : '';

      setFeedback({
        type: 'success',
        message: clerkDeleted
          ? (language === 'ar'
              ? `تم حذف حساب العميل "${clientName}" بنجاح من قاعدة البيانات وخوادم Clerk معاً.`
              : `Client "${clientName}" credentials successfully purged from MongoDB and Clerk.`)
          : (language === 'ar'
              ? `تم حذف وتطهير بيانات العميل "${clientName}" من قاعدة بيانات الموقع بنجاح. (تنبيه: الحذف من خوادم Clerk يتطلب توفير مفتاح Secret Key صالح).`
              : `Client "${clientName}" purged from MongoDB. (Notice: Clerk deletion requires a valid secret key).`),
        details: [clerkMsg, mongoDetails].filter(Boolean).join(' · '),
      });
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: language === 'ar'
          ? 'فشل حذف حساب العميل من النظام'
          : 'Failed to delete client account',
        details: err?.message || (language === 'ar' ? 'يرجى المحاولة مرة أخرى أو فحص سجلات الخادم.' : 'Please retry or verify server logs.'),
      });
    },
  });

  // Strictly filter out any admin profiles and deduplicate clients by unique userId
  const seenUserIds = new Set<string>();
  const clientAccounts = clients.filter((c) => {
    if (!c.userId || seenUserIds.has(c.userId)) {
      return false;
    }
    const isAdmin =
      c.userId === 'admin_super_user' ||
      c.email?.toLowerCase() === 'admin@aj-industry.com' ||
      c.name?.includes('المهندس المسؤول') ||
      c.name?.includes('المدير');
    if (isAdmin) {
      return false;
    }
    seenUserIds.add(c.userId);
    return true;
  });

  // Apply search query filter
  const filteredClients = clientAccounts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.userId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="font-code text-[10px] tracking-[.2em] text-primary">
            ADMIN / 05 — CLIENT DIRECTORY
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {adminText(language, 'دليل عملاء AJ Industry', 'Client Accounts Directory')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminText(
              language,
              'سجل العملاء الموثقين عبر Clerk وقاعدة بيانات MongoDB، مع إمكانية إدارة الحسابات وحذف بيانات الاعتماد.',
              'Verified client profiles synced with Clerk and MongoDB, with full credentials lifecycle management.',
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            void refetch();
          }}
          className="flex h-9 items-center gap-2 border border-border bg-secondary/40 px-3.5 font-code text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          <span>{adminText(language, 'تحديث', 'Refresh')}</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 border p-4 ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-300'
              : 'border-red-500/30 bg-red-950/25 text-red-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="size-5 shrink-0 text-red-400 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold">{feedback.message}</p>
              {feedback.details && (
                <p className="mt-1 font-code text-xs opacity-85">{feedback.details}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            title="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Clerk Cloud Synchronization & Control Card */}
      <div className="rounded-xl border border-[#2a4164] bg-[#0b1528] p-5 shadow-lg">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-[#2a4164]/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
              <Cloud className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {adminText(language, 'مزامنة Clerk السحابية وإدارة المفاتيح', 'Clerk Cloud Sync & Secret Key Control')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {adminText(
                  language,
                  'التحكم في حذف الحسابات ومزامنة بيانات الاعتماد مباشرة بين MongoDB وسحابة Clerk.',
                  'Direct synchronization and automated user purging between MongoDB and Clerk servers.'
                )}
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2">
            {isClerkStatusLoading ? (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>فحص الربط...</span>
              </span>
            ) : clerkStatus?.valid ? (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-code text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                <span>{adminText(language, `متصل (${clerkStatus.keyPrefix || 'sk_test_...'})`, `Connected (${clerkStatus.keyPrefix || 'Active'})`)}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-code text-xs font-semibold text-amber-400">
                <AlertTriangle className="size-3.5" />
                <span>{adminText(language, 'بحاجة لمفتاح صالح sk_test_...', 'Secret Key (sk_test_...) Required')}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => void refetchClerkStatus()}
              className="grid size-8 place-items-center rounded-lg border border-border/80 bg-secondary/30 text-muted-foreground transition-colors hover:text-foreground"
              title="إعادة فحص الاتصال"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            {adminText(
              language,
              '💡 توضيح تقني: عند حذف أي حساب عميل من الجدول بالأسفل، يتم فوراً شطب بياناته وسجلاته بالكامل من قاعدة بيانات الموقع (MongoDB). لكي يتم أيضاً حذف الحساب من خوادم Clerk السحابية (حتى لا يظهر للمستخدم "That email is taken" عند التسجيل مجدداً)، يجب تزويد النظام بمفتاح Secret Key صالح من لوحة Clerk، أو استخدام أداة التطهير المباشر بالأسفل.',
              '💡 Technical note: Deleting a client below immediately purges all profiles and sessions from MongoDB. To also purge the account from Clerk servers automatically (preventing "That email is taken" on re-registration), a valid Clerk Secret Key is required.'
            )}
          </p>
        </div>

        {/* Action Tools Grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Tool 1: Force Purge by Email */}
          <div className="rounded-lg border border-[#2a4164]/80 bg-[#101f37] p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserMinus className="size-4 text-destructive" />
              <h3 className="text-xs font-bold text-foreground">
                {adminText(language, 'تطهير حساب محدد بالبريد الإلكتروني', 'Force Purge User by Email')}
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              {adminText(
                language,
                'أدخل البريد (مثل kaliofmylaptop@gmail.com) لشطبه نهائياً من قاعدة البيانات وخوادم Clerk.',
                'Enter email to wipe all credentials from MongoDB and attempt direct Clerk cloud deletion.'
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={purgeEmailInput}
                onChange={(e) => setPurgeEmailInput(e.target.value)}
                placeholder="kaliofmylaptop@gmail.com"
                className="h-9 flex-1 rounded-md border border-border/80 bg-[#0b1528] px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                disabled={!purgeEmailInput.trim() || purgeUserMutation.isPending}
                onClick={() => purgeUserMutation.mutate(purgeEmailInput.trim())}
                className="flex h-9 items-center gap-1.5 rounded-md bg-destructive/90 px-3.5 text-xs font-bold text-destructive-foreground transition-opacity hover:bg-destructive disabled:opacity-50"
              >
                {purgeUserMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>{adminText(language, 'تطهير الآن', 'Purge Now')}</span>
              </button>
            </div>
            {!clerkStatus?.valid && (
              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <span className="text-amber-400/90">
                  {adminText(language, 'لحذف المستخدم يدوياً من Clerk بنقرة واحدة:', 'To delete user directly in Clerk:')}
                </span>
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Clerk Dashboard &rarr;</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>

          {/* Tool 2: Configure Secret Key */}
          <div className="rounded-lg border border-[#2a4164]/80 bg-[#101f37] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="size-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground">
                {adminText(language, 'تهيئة مفتاح Clerk Secret Key', 'Configure Clerk Secret Key')}
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              {adminText(
                language,
                'الصق المفتاح الذي يبدأ بـ sk_test_... من dashboard.clerk.com -> API Keys لتفعيل الحذف التلقائي.',
                'Paste key starting with sk_test_... from dashboard.clerk.com -> API Keys to enable automated deletion.'
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={clerkKeyInput}
                onChange={(e) => setClerkKeyInput(e.target.value)}
                placeholder="sk_test_••••••••••••••••••••••••"
                className="h-9 flex-1 rounded-md border border-border/80 bg-[#0b1528] px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                disabled={!clerkKeyInput.trim() || updateClerkKeyMutation.isPending}
                onClick={() => updateClerkKeyMutation.mutate(clerkKeyInput.trim())}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-bold text-[#071126] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {updateClerkKeyMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                <span>{adminText(language, 'حفظ واختبار', 'Save & Test')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={adminText(
              language,
              'البحث بالاسم، البريد الإلكتروني، الشركة، أو المعرّف...',
              'Search by name, email, company, or user ID...',
            )}
            className="h-10 w-full rounded-md border border-border/80 bg-[#101f37] pl-3.5 pr-9 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2 font-code text-xs text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-emerald-500" />
          <span>
            {filteredClients.length} / {clientAccounts.length}{' '}
            {adminText(language, 'عميل معروض', 'clients shown')}
          </span>
        </div>
      </div>

      {/* Clients grid */}
      <div className="border border-border bg-[#0b1528]">
        <div className="border-b border-border/80 px-6 py-4 flex items-center justify-between">
          <p className="font-code text-xs text-muted-foreground">
            {clientAccounts.length} {adminText(language, 'عميل مسجل في قاعدة البيانات', 'registered clients in database')}
          </p>
          <span className="font-code text-[11px] text-primary/80">
            Clerk Auth & MongoDB Synced
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto size-6 animate-spin text-primary mb-3" />
            {adminText(language, 'جارٍ تحميل بيانات العملاء…', 'Loading client accounts…')}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-display text-base font-bold text-foreground">
              {searchQuery.trim()
                ? adminText(language, 'لا توجد نتائج مطابقة لبحثك', 'No clients match your search')
                : adminText(language, 'لا يوجد عملاء مسجلون بعد', 'No client accounts found')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery.trim()
                ? adminText(language, 'جرّب تغيير كلمات البحث أو مسح حقل البحث.', 'Try altering your search keywords or clearing the filter.')
                : adminText(
                    language,
                    'عند تسجيل أي عميل دخوله في النظام، سيظهر حسابه وسجل طلباته هنا تلقائياً.',
                    'When clients authenticate, their profiles will automatically register here.',
                  )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredClients.map((c, index) => (
              <div
                key={c.userId || `client-${index}`}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-secondary/20 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-7 place-items-center border border-primary/50 bg-primary/10 font-code text-xs font-bold text-primary">
                      {c.name ? c.name.slice(0, 1).toUpperCase() : 'C'}
                    </span>
                    <h3 className="font-display text-base font-bold text-foreground truncate">{c.name}</h3>
                    {c.company && (
                      <span className="flex items-center gap-1 border border-border/80 bg-secondary/50 px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                        <Building2 className="size-3 text-primary" />
                        {c.company}
                      </span>
                    )}
                    {c.userId?.startsWith('user_') && (
                      <span className="border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 font-code text-[10px] text-sky-400">
                        Clerk Verified
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary">
                      <Mail className="size-3" />
                      {c.email}
                    </span>
                    <span>·</span>
                    <span className="font-code text-[10px] text-muted-foreground" title={c.userId}>
                      ID: {c.userId?.length > 22 ? `${c.userId.slice(0, 20)}...` : c.userId}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            dateStyle: 'medium',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Project Stats badges & Delete Action Button */}
                <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0">
                  <div className="border border-border/80 bg-secondary/40 px-3 py-1.5 text-center min-w-[90px]">
                    <p className="font-code text-[9px] text-muted-foreground uppercase">
                      {adminText(language, 'طلبات الطباعة', 'Print Orders')}
                    </p>
                    <p className="font-display text-sm font-bold text-foreground">
                      {c.stats?.totalPrintRequests ?? 0}
                    </p>
                  </div>

                  <div className="border border-border/80 bg-secondary/40 px-3 py-1.5 text-center min-w-[90px]">
                    <p className="font-code text-[9px] text-muted-foreground uppercase">
                      {adminText(language, 'الاستشارات', 'Consultations')}
                    </p>
                    <p className="font-display text-sm font-bold text-foreground">
                      {c.stats?.totalConsultations ?? 0}
                    </p>
                  </div>

                  {/* Delete Client Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientForDeletion(c);
                      setDeleteAssociatedData(true);
                    }}
                    className="flex h-10 items-center gap-2 border border-red-500/30 bg-red-950/20 px-3.5 font-code text-xs font-semibold text-red-400 transition-all hover:border-red-500 hover:bg-red-950/50 hover:text-red-300"
                    title={adminText(language, 'حذف العميل نهائياً من Clerk و MongoDB', 'Permanently delete client from Clerk & MongoDB')}
                  >
                    <Trash2 className="size-3.5" />
                    <span>{adminText(language, 'حذف العميل', 'Delete Client')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Client Deletion */}
      {selectedClientForDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg border border-red-500/40 bg-[#071126] p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg border border-red-500/40 bg-red-950/50 text-red-400">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {adminText(language, 'تأكيد حذف حساب العميل وبيانات اعتماده', 'Confirm Client Account & Credentials Deletion')}
                  </h2>
                  <p className="font-code text-[11px] text-red-400">
                    {adminText(language, 'إجراء نهائي لا رجعة فيه', 'Irreversible Permanent Action')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={deleteClientMutation.isPending}
                onClick={() => setSelectedClientForDeletion(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Target Client Card */}
            <div className="border border-border/70 bg-[#0f1c33] p-4 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-foreground text-sm">
                  {selectedClientForDeletion.name}
                </span>
                {selectedClientForDeletion.company && (
                  <span className="font-code text-xs text-primary">
                    {selectedClientForDeletion.company}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-code">
                {selectedClientForDeletion.email}
              </p>
              <p className="text-[11px] text-muted-foreground/70 font-code truncate">
                User ID: {selectedClientForDeletion.userId}
              </p>
            </div>

            {/* Warning Text */}
            <div className="border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200/90 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{adminText(language, 'ما الذي سيحدث عند الحذف؟', 'What happens upon deletion?')}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/80">
                <li>
                  {adminText(
                    language,
                    'حذف حساب العميل فوراً من Clerk وإلغاء صلاحية كافة جلسات تسجيل الدخول النشطة.',
                    'Immediate deletion of user credentials from Clerk and revoking of all active sessions.',
                  )}
                </li>
                <li>
                  {adminText(
                    language,
                    'حذف الملف الشخصي وبيانات العميل نهائياً من قاعدة بيانات MongoDB.',
                    'Permanent removal of user profile, auth records, and sessions from MongoDB.',
                  )}
                </li>
              </ul>
            </div>

            {/* Associated data checkbox option */}
            <label className="flex items-center gap-3 text-xs text-muted-foreground cursor-pointer select-none bg-secondary/30 p-3 border border-border/70">
              <input
                type="checkbox"
                checked={deleteAssociatedData}
                onChange={(e) => setDeleteAssociatedData(e.target.checked)}
                className="size-4 accent-red-500 rounded border-border"
              />
              <span>
                {adminText(
                  language,
                  'حذف جميع طلبات الطباعة والاستشارات الهندسية المرتبطة بهذا العميل أيضاً من قاعدة البيانات',
                  'Also purge associated 3D print orders and engineering consultations from database',
                )}
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteClientMutation.isPending}
                onClick={() => setSelectedClientForDeletion(null)}
                className="h-10 border border-border bg-secondary/40 px-4 font-code text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {adminText(language, 'إلغاء التراجع', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={deleteClientMutation.isPending}
                onClick={() => {
                  if (!selectedClientForDeletion?.userId) return;
                  deleteClientMutation.mutate({
                    userId: selectedClientForDeletion.userId,
                    deleteAssociated: deleteAssociatedData,
                  });
                }}
                className="flex h-10 items-center gap-2 border border-red-500 bg-red-600 px-5 font-code text-xs font-bold text-white shadow-lg shadow-red-950/50 transition-all hover:bg-red-500 disabled:opacity-50"
              >
                {deleteClientMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{adminText(language, 'جارٍ الحذف من Clerk و MongoDB...', 'Deleting from Clerk & MongoDB...')}</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="size-4" />
                    <span>{adminText(language, 'تأكيد الحذف النهائي', 'Confirm Final Deletion')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
