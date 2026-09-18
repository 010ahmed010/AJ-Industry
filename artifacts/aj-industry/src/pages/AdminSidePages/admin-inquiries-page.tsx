import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  Archive,
  Building2,
  Check,
  Clock,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react';
import {
  adminText,
  StatusBadge,
  type AdminInquiry,
  type Language,
} from './admin-dashboard-shell';

export function AdminInquiriesPage({ language }: { language: Language }) {
  const queryClient = useQueryClient();
  const [selectedInquiry, setSelectedInquiry] = useState<AdminInquiry | null>(null);
  const [status, setStatus] = useState<AdminInquiry['status']>('new');
  const [notes, setNotes] = useState('');

  const { data: inquiries = [], isLoading, isFetching, refetch } = useQuery<AdminInquiry[]>({
    queryKey: ['admin-inquiries'],
    queryFn: () => customFetch<AdminInquiry[]>('/api/admin/inquiries'),
    refetchInterval: 10_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; status: AdminInquiry['status']; adminNotes?: string }) => {
      return customFetch(`/api/admin/inquiries/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-inquiries'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setSelectedInquiry(null);
    },
  });

  const openEdit = (inquiry: AdminInquiry) => {
    setSelectedInquiry(inquiry);
    setStatus(inquiry.status || 'new');
    setNotes(inquiry.adminNotes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    updateMutation.mutate({
      id: selectedInquiry._id,
      status,
      adminNotes: notes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="font-code text-[10px] tracking-[.2em] text-primary">
            ADMIN / 04 — PUBLIC INQUIRIES
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {adminText(language, 'رسائل واستفسارات الموقع العام', 'Public Site Inquiries')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminText(
              language,
              'الرسائل والطلبات الواردة من نموذج التواصل في الموقع العام والمحفوظة في MongoDB.',
              'Lead messages and technical queries from the public contact forms stored in MongoDB.',
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

      {/* Inquiries list */}
      <div className="border border-border bg-[#0b1528]">
        <div className="border-b border-border/80 px-6 py-4">
          <p className="font-code text-xs text-muted-foreground">
            {inquiries.length} {adminText(language, 'رسالة مسجلة', 'messages recorded')}
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {adminText(language, 'جارٍ تحميل الرسائل…', 'Loading inquiries…')}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-display text-base font-bold text-foreground">
              {adminText(language, 'لا توجد رسائل واردة حالياً', 'No inquiries recorded yet')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {inquiries.map((inq) => (
              <div
                key={inq._id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-secondary/20 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={inq.status || 'new'} language={language} />
                    <span className="font-code text-xs text-primary font-bold">{inq.reference}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(inq.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-foreground">
                    {inq.name}
                    {inq.company && (
                      <span className="ml-2 font-normal text-xs text-muted-foreground">
                        ({inq.company})
                      </span>
                    )}
                  </h3>

                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line max-w-2xl">
                    {inq.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <a
                      href={`mailto:${inq.email}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="size-3" />
                      {inq.email}
                    </a>
                    {inq.phone && (
                      <a
                        href={`tel:${inq.phone}`}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="size-3" />
                        {inq.phone}
                      </a>
                    )}
                  </div>

                  {inq.adminNotes && (
                    <div className="border-t border-border/40 pt-2 text-xs text-emerald-400">
                      <strong>{adminText(language, 'ملاحظة الإدارة:', 'Admin note:')}</strong> {inq.adminNotes}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(inq)}
                    className="flex h-9 items-center gap-1.5 border border-border bg-secondary/50 px-3 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <span>{adminText(language, 'تحديث الحالة / ملاحظة', 'Status & Notes')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedInquiry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col border border-border bg-[#0b1528] shadow-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-border p-5">
              <div>
                <span className="font-code text-[10px] tracking-[.2em] text-primary">
                  INQUIRY / {selectedInquiry.reference}
                </span>
                <h2 className="mt-1 font-display text-lg font-bold text-foreground">
                  {selectedInquiry.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="grid size-8 place-items-center border border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto p-5">
              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'حالة الرسالة', 'Inquiry Status')}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="new">{adminText(language, 'جديد (New)', 'New')}</option>
                  <option value="reviewing">{adminText(language, 'قيد المراجعة (Reviewing)', 'Reviewing')}</option>
                  <option value="contacted">{adminText(language, 'تم التواصل (Contacted)', 'Contacted')}</option>
                  <option value="archived">{adminText(language, 'مؤرشف (Archived)', 'Archived')}</option>
                </select>
              </div>

              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'ملاحظات الإدارة الداخلية', 'Internal Admin Notes')}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={adminText(
                    language,
                    'دوّن ملاحظات الاتصال، ملخص العرض، أو أي تعليمات لفريق المبيعات…',
                    'Log contact notes, deal summary, or next steps…',
                  )}
                  className="mt-1.5 w-full border border-border bg-secondary/40 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="h-9 border border-border px-3 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {adminText(language, 'إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex h-9 items-center gap-2 bg-primary px-4 font-code text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  <Check className="size-3.5" />
                  <span>{adminText(language, 'حفظ', 'Save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
