import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Edit3,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  User,
  UserMinus,
  Users,
  X,
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

export function AdminClientsPage({ language }: { language: Language }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientForDeletion, setSelectedClientForDeletion] = useState<AdminClientProfile | null>(null);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<AdminClientProfile | null>(null);
  const [editForm, setEditForm] = useState({ name: '', company: '', email: '' });
  const [deleteAssociatedData, setDeleteAssociatedData] = useState(true);
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
      // Invalidate relevant queries to immediately refresh statistics and client list
      void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });

      const clientName = selectedClientForDeletion?.name || variables.userId;
      setSelectedClientForDeletion(null);

      const clerkMsg = data.clerk?.deleted
        ? (language === 'ar' ? 'تم حذف الحساب من Clerk' : 'Removed from Clerk')
        : (data.clerk?.message || '');

      const mongoDetails = data.mongodb
        ? `${language === 'ar' ? 'تمت إزالة سجلات MongoDB' : 'Removed MongoDB records'}: ${data.mongodb.profilesDeleted} ملفات, ${data.mongodb.sessionsDeleted} جلسات${data.mongodb.requestsDeleted ? `, ${data.mongodb.requestsDeleted} طلبات` : ''}`
        : '';

      setFeedback({
        type: 'success',
        message: language === 'ar'
          ? `تم حذف حساب العميل "${clientName}" بنجاح من MongoDB و Clerk.`
          : `Client "${clientName}" credentials successfully purged from MongoDB and Clerk.`,
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

  // Edit mutation calling our PATCH /api/admin/clients/:userId endpoint
  const editClientMutation = useMutation({
    mutationFn: async ({ userId, name, company, email }: { userId: string; name: string; company: string; email: string }) => {
      return customFetch<{ success: boolean; message: string; clerk?: { message: string } }>(
        `/api/admin/clients/${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, company, email }),
        }
      );
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setSelectedClientForEdit(null);
      setFeedback({
        type: 'success',
        message: language === 'ar'
          ? 'تم تحديث بيانات العميل بنجاح في قاعدة البيانات و Clerk.'
          : 'Client account successfully updated in MongoDB & Clerk.',
        details: data.clerk?.message,
      });
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل تحديث بيانات العميل' : 'Failed to update client account',
        details: err?.message || (language === 'ar' ? 'يرجى المحاولة مرة أخرى.' : 'Please retry.'),
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

                  {/* Edit Client Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientForEdit(c);
                      setEditForm({
                        name: c.name || '',
                        company: c.company || '',
                        email: c.email || '',
                      });
                    }}
                    className="flex h-10 items-center gap-2 border border-primary/40 bg-primary/10 px-3.5 font-code text-xs font-semibold text-primary transition-all hover:border-primary hover:bg-primary/20"
                    title={adminText(language, 'تعديل بيانات العميل في Clerk و MongoDB', 'Edit client credentials in Clerk & MongoDB')}
                  >
                    <Edit3 className="size-3.5" />
                    <span>{adminText(language, 'تعديل', 'Edit')}</span>
                  </button>

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

      {/* Modal for Client Editing */}
      {selectedClientForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg border border-primary/40 bg-[#071126] p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {adminText(language, 'تعديل بيانات العميل', 'Edit Client Profile')}
                  </h2>
                  <p className="font-code text-[11px] text-primary">
                    {adminText(language, 'مزامنة مباشرة مع قاعدة البيانات و Clerk', 'Direct sync with MongoDB & Clerk')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={editClientMutation.isPending}
                onClick={() => setSelectedClientForEdit(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block font-code text-xs text-muted-foreground mb-1">
                  {adminText(language, 'اسم العميل / جهة الاتصال', 'Full Name')}
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. أحمد محمد"
                  className="h-10 w-full rounded-md border border-border/80 bg-[#101f37] px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block font-code text-xs text-muted-foreground mb-1">
                  {adminText(language, 'اسم الشركة أو المؤسسة', 'Company / Organization')}
                </label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. مصنع الفرات للصناعات"
                  className="h-10 w-full rounded-md border border-border/80 bg-[#101f37] px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block font-code text-xs text-muted-foreground mb-1">
                  {adminText(language, 'البريد الإلكتروني', 'Email Address')}
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. client@company.com"
                  className="h-10 w-full rounded-md border border-border/80 bg-[#101f37] px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div className="p-3 border border-border/60 bg-secondary/30 text-[11px] text-muted-foreground font-code">
                Client ID: {selectedClientForEdit.userId}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={editClientMutation.isPending}
                onClick={() => setSelectedClientForEdit(null)}
                className="h-10 border border-border bg-secondary/40 px-4 font-code text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {adminText(language, 'إلغاء', 'Cancel')}
              </button>

              <button
                type="button"
                disabled={editClientMutation.isPending || !editForm.name.trim()}
                onClick={() => {
                  if (!selectedClientForEdit?.userId) return;
                  editClientMutation.mutate({
                    userId: selectedClientForEdit.userId,
                    name: editForm.name.trim(),
                    company: editForm.company.trim(),
                    email: editForm.email.trim(),
                  });
                }}
                className="flex h-10 items-center gap-2 border border-primary bg-primary px-5 font-code text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {editClientMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{adminText(language, 'جارٍ حفظ التعديلات...', 'Saving...')}</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>{adminText(language, 'حفظ التعديلات', 'Save Changes')}</span>
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
