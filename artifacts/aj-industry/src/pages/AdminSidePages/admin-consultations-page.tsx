import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  User,
  UserCheck,
  Users,
  X,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import {
  adminText,
  StatusBadge,
  type AdminConsultation,
  type Language,
} from './admin-dashboard-shell';

export function AdminConsultationsPage({ language }: { language: Language }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConsultation, setSelectedConsultation] = useState<AdminConsultation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit fields
  const [editStatus, setEditStatus] = useState<AdminConsultation['status']>('submitted');
  const [editSpecialist, setEditSpecialist] = useState('');
  const [editMeetingDate, setEditMeetingDate] = useState('');
  const [editResponse, setEditResponse] = useState('');

  const { data: consultations = [], isLoading, isFetching, refetch } = useQuery<AdminConsultation[]>({
    queryKey: ['admin-consultations', statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      return customFetch<AdminConsultation[]>(`/api/admin/consultations?${params.toString()}`);
    },
    refetchInterval: 8_000,
  });

  const filteredConsultations = consultations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.reference?.toLowerCase().includes(q) ||
      c.client?.name?.toLowerCase().includes(q) ||
      c.client?.company?.toLowerCase().includes(q) ||
      c.client?.email?.toLowerCase().includes(q) ||
      c.details?.toLowerCase().includes(q) ||
      c.assignedSpecialist?.toLowerCase().includes(q)
    );
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status: AdminConsultation['status'];
      assignedSpecialist?: string;
      meetingScheduledAt?: string;
      adminResponse?: string;
    }) => {
      return customFetch(`/api/admin/consultations/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['client-consultations'] });
      setSelectedConsultation(null);
    },
  });

  const [consultationToDelete, setConsultationToDelete] = useState<AdminConsultation | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return customFetch(`/api/admin/consultations/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['client-consultations'] });
      setConsultationToDelete(null);
      setSelectedConsultation(null);
    },
  });

  const toggleSuspend = (c: AdminConsultation) => {
    const isCurrentlySuspended = c.status === 'suspended';
    const nextStatus = isCurrentlySuspended ? 'reviewing' : 'suspended';
    updateMutation.mutate({
      id: c.id,
      status: nextStatus,
      adminResponse: isCurrentlySuspended
        ? (c.adminResponse || 'تم استئناف الاستشارة الهندسية')
        : (c.adminResponse || 'تم تعليق الاستشارة مؤقتاً لمراجعة المتطلبات'),
    });
  };

  const openEditModal = (c: AdminConsultation) => {
    setSelectedConsultation(c);
    setEditStatus(c.status);
    setEditSpecialist(c.assignedSpecialist || 'م. أحمد الجابري (كبير المهندسين)');
    setEditMeetingDate(c.meetingScheduledAt ? c.meetingScheduledAt.slice(0, 16) : '');
    setEditResponse(c.adminResponse || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    updateMutation.mutate({
      id: selectedConsultation.id,
      status: editStatus,
      assignedSpecialist: editSpecialist || undefined,
      meetingScheduledAt: editMeetingDate || undefined,
      adminResponse: editResponse || undefined,
    });
  };

  const filterTabs = [
    { key: 'all', labelAr: 'الكل', labelEn: 'All' },
    { key: 'submitted', labelAr: 'جديد / استلام', labelEn: 'Submitted' },
    { key: 'reviewing', labelAr: 'قيد الدراسة', labelEn: 'Reviewing' },
    { key: 'contacted', labelAr: 'تم التواصل', labelEn: 'Contacted' },
    { key: 'completed', labelAr: 'منجز', labelEn: 'Completed' },
    { key: 'suspended', labelAr: 'معلّق مؤقتاً', labelEn: 'Suspended' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="font-code text-[10px] tracking-[.2em] text-primary">
            ADMIN / 03 — ENGINEERING CONSULTATIONS
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {adminText(language, 'إدارة الاستشارات والخبراء الهندسيين', 'Engineering Consultations Desk')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminText(
              language,
              'مراجعة استشارات العملاء، تعيين المهندس المشرف، وجدولة المواعيد مع العميل.',
              'Review technical requests, assign lead specialists, and coordinate advisory sessions with clients.',
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          className="flex h-9 items-center gap-2 border border-border bg-secondary/40 px-3.5 font-code text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          <span>{adminText(language, 'تحديث', 'Refresh')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 border border-border bg-[#0b1528] p-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 font-code text-xs transition-colors ${
              statusFilter === tab.key
                ? 'bg-primary text-primary-foreground font-bold'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {adminText(language, tab.labelAr, tab.labelEn)}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      <div className="border border-border bg-[#0b1528]">
        <div className="border-b border-border/80 px-6 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary" />
            <p className="font-code text-xs text-muted-foreground">
              {filteredConsultations.length} / {consultations.length}{' '}
              {adminText(language, 'استشارة مسجلة', 'consultations registered')}
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={adminText(
                language,
                'البحث بالمرجع، العنوان، العميل، أو المتخصص...',
                'Search reference, title, client, or specialist...',
              )}
              className="h-9 w-full rounded border border-border/80 bg-[#101f37] pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="مسح"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {adminText(language, 'جارٍ تحميل الاستشارات…', 'Loading consultations…')}
          </div>
        ) : consultations.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-display text-base font-bold text-foreground">
              {adminText(language, 'لا توجد طلبات استشارة حالياً', 'No consultations found')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {adminText(
                language,
                'يمكن للعملاء تقديم استشارات هندسية عبر لوحة العميل وستظهر هنا فوراً.',
                'Clients can submit consultations from their workspace and they will appear here immediately.',
              )}
            </p>
          </div>
        ) : filteredConsultations.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="mx-auto size-7 text-muted-foreground/40" />
            <p className="mt-3 font-display text-sm font-bold text-foreground">
              {adminText(language, 'لا توجد استشارات مطابقة لبحثك', 'No consultations match your search')}
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-primary underline hover:text-primary/80"
            >
              {adminText(language, 'إلغاء تصفية البحث', 'Clear search filter')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto overscroll-contain">
            {filteredConsultations.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-secondary/20 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={c.status}
                      statusAr={c.statusAr}
                      statusEn={c.statusEn}
                      language={language}
                    />
                    <span className="font-code text-xs text-primary font-bold">{c.reference}</span>
                    <span className="border border-border/80 bg-secondary/50 px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                      {c.kind === 'specialist'
                        ? adminText(language, 'طلب متخصص', 'Specialist')
                        : adminText(language, 'استشارة عامة', 'Consultation')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-foreground">{c.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground max-w-2xl whitespace-pre-line">
                    {c.details}
                  </p>

                  {/* Client Info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <User className="size-3.5 text-primary" />
                    <span className="font-semibold text-foreground">{c.client.name}</span>
                    {c.client.company && (
                      <span className="border border-border/80 bg-secondary/50 px-1.5 py-0.5 font-code text-[10px]">
                        {c.client.company}
                      </span>
                    )}
                    <span>({c.client.email})</span>
                  </div>

                  {/* Admin feedback / scheduled meeting */}
                  {(c.adminResponse || c.assignedSpecialist || c.meetingScheduledAt) && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border/40 pt-2 text-xs">
                      {c.assignedSpecialist && (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <UserCheck className="size-3.5" />
                          {adminText(language, 'المهندس المشرف:', 'Specialist:')} {c.assignedSpecialist}
                        </span>
                      )}
                      {c.meetingScheduledAt && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Clock className="size-3.5" />
                          {adminText(language, 'الموعد:', 'Scheduled:')} {new Date(c.meetingScheduledAt).toLocaleString()}
                        </span>
                      )}
                      {c.adminResponse && (
                        <span className="text-muted-foreground italic truncate max-w-md">
                          "{c.adminResponse}"
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="flex h-10 items-center gap-2 bg-primary px-3.5 font-code text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>{adminText(language, 'الرد والجدولة', 'Reply & Schedule')}</span>
                  </button>

                  {/* Quick Suspend / Resume Button */}
                  <button
                    type="button"
                    onClick={() => toggleSuspend(c)}
                    title={c.status === 'suspended' ? adminText(language, 'استئناف الاستشارة', 'Resume Consultation') : adminText(language, 'تعليق الاستشارة', 'Suspend Consultation')}
                    className={`flex h-10 items-center gap-1.5 border px-3 font-code text-xs font-semibold transition-colors ${
                      c.status === 'suspended'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    }`}
                  >
                    {c.status === 'suspended' ? (
                      <>
                        <PlayCircle className="size-3.5" />
                        <span>{adminText(language, 'استئناف', 'Resume')}</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="size-3.5" />
                        <span>{adminText(language, 'تعليق', 'Suspend')}</span>
                      </>
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setConsultationToDelete(c)}
                    title={adminText(language, 'حذف الاستشارة نهائياً', 'Delete Consultation')}
                    className="flex h-10 items-center gap-1.5 border border-rose-500/40 bg-rose-500/10 px-3 font-code text-xs font-semibold text-rose-400 transition-colors hover:border-rose-500/70 hover:bg-rose-500/20"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">{adminText(language, 'حذف', 'Delete')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedConsultation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col border border-border bg-[#0b1528] shadow-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-border p-5 sm:p-6">
              <div>
                <span className="font-code text-[10px] tracking-[.2em] text-primary">
                  CONSULTATION / {selectedConsultation.reference}
                </span>
                <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                  {adminText(language, 'الرد على الاستشارة الهندسية', 'Respond to Consultation')}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedConsultation.title} — {selectedConsultation.client.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConsultation(null)}
                className="grid size-8 place-items-center border border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto p-5 sm:p-6">
              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'حالة الاستشارة', 'Consultation Status')}
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="submitted">{adminText(language, 'تم الاستلام (Submitted)', 'Submitted')}</option>
                  <option value="reviewing">{adminText(language, 'قيد المراجعة والتحضير (Reviewing)', 'Reviewing')}</option>
                  <option value="contacted">{adminText(language, 'تم التواصل والجدولة (Contacted)', 'Contacted & Scheduled')}</option>
                  <option value="completed">{adminText(language, 'تم إنجاز الاستشارة (Completed)', 'Completed')}</option>
                  <option value="suspended">{adminText(language, 'معلّق مؤقتاً (Suspended)', 'Suspended / On-Hold')}</option>
                </select>
              </div>

              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'المهندس أو الخبير المشرف', 'Assigned Specialist / Lead Engineer')}
                </label>
                <input
                  type="text"
                  value={editSpecialist}
                  onChange={(e) => setEditSpecialist(e.target.value)}
                  placeholder="e.g. Eng. Ahmed Al-Jabri (Senior Mechatronics)"
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'موعد الجلسة الاستشارية / الاتصال', 'Meeting / Session Date & Time')}
                </label>
                <input
                  type="datetime-local"
                  value={editMeetingDate}
                  onChange={(e) => setEditMeetingDate(e.target.value)}
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'رد وتوجيهات الفريق الهندسي للعميل', 'Engineering Response to Client')}
                </label>
                <textarea
                  rows={4}
                  value={editResponse}
                  onChange={(e) => setEditResponse(e.target.value)}
                  placeholder={adminText(
                    language,
                    'اكتب التوجيهات الهندسية، رابط اجتماع Google Meet / Zoom، أو أي استفسارات موجهة للعميل…',
                    'Technical feedback, Google Meet / Zoom link, or instructions for the client…',
                  )}
                  className="mt-1.5 w-full border border-border bg-secondary/40 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedConsultation;
                    setSelectedConsultation(null);
                    setConsultationToDelete(c);
                  }}
                  className="flex items-center gap-1.5 border border-rose-500/40 bg-rose-500/10 px-3 py-2 font-code text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                >
                  <Trash2 className="size-3.5" />
                  <span>{adminText(language, 'حذف الاستشارة', 'Delete Consultation')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedConsultation(null)}
                    className="h-10 border border-border px-4 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {adminText(language, 'إلغاء', 'Cancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex h-10 items-center gap-2 bg-primary px-5 font-code text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    <span>{adminText(language, 'حفظ الرد وإرساله', 'Save Response')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Consultation Confirmation Modal */}
      {consultationToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md border border-rose-500/40 bg-[#0b1528] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-400">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  {adminText(language, 'تأكيد حذف الاستشارة الهندسية', 'Confirm Delete Consultation')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {adminText(
                    language,
                    `هل أنت متأكد من حذف استشارة "${consultationToDelete.title}" (المرجع: ${consultationToDelete.reference})؟ سيتم حذفها نهائياً من النظام.`,
                    `Are you sure you want to permanently delete consultation "${consultationToDelete.title}" (${consultationToDelete.reference})? This action cannot be undone.`,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => setConsultationToDelete(null)}
                disabled={deleteMutation.isPending}
                className="h-9 border border-border px-4 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {adminText(language, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(consultationToDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex h-9 items-center gap-2 border border-rose-500/60 bg-rose-600 px-4 font-code text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>{adminText(language, 'نعم، احذف الاستشارة', 'Yes, Delete Consultation')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
