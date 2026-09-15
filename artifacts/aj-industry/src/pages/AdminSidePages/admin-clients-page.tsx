import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  Building2,
  Calendar,
  ExternalLink,
  Mail,
  Printer,
  RefreshCw,
  Search,
  User,
  Users,
} from 'lucide-react';
import {
  adminText,
  type AdminClientProfile,
  type Language,
} from './admin-dashboard-shell';

export function AdminClientsPage({ language }: { language: Language }) {
  const { data: clients = [], isLoading, isFetching, refetch } = useQuery<AdminClientProfile[]>({
    queryKey: ['admin-clients'],
    queryFn: () => customFetch<AdminClientProfile[]>('/api/admin/clients'),
    refetchInterval: 12_000,
  });

  return (
    <div className="space-y-6">
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
              'سجل العملاء الموثقين عبر Clerk وقاعدة بيانات MongoDB، مع إحصائيات مشاريعهم الهندسية.',
              'Verified client profiles synced with Clerk and MongoDB, tracking their project volume and activity.',
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

      {/* Clients grid */}
      <div className="border border-border bg-[#0b1528]">
        <div className="border-b border-border/80 px-6 py-4">
          <p className="font-code text-xs text-muted-foreground">
            {clients.length} {adminText(language, 'عميل مسجل في قاعدة البيانات', 'registered clients')}
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {adminText(language, 'جارٍ تحميل بيانات العملاء…', 'Loading client accounts…')}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-display text-base font-bold text-foreground">
              {adminText(language, 'لا يوجد عملاء مسجلون بعد', 'No client accounts found')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {adminText(
                language,
                'عند تسجيل أي عميل دخوله في النظام، سيظهر حسابه وسجل طلباته هنا تلقائياً.',
                'When clients authenticate, their profiles will automatically register here.',
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {clients.map((c) => (
              <div
                key={c.userId}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-secondary/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center border border-primary/50 bg-primary/10 font-code text-xs font-bold text-primary">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <h3 className="font-display text-base font-bold text-foreground">{c.name}</h3>
                    {c.company && (
                      <span className="flex items-center gap-1 border border-border/80 bg-secondary/50 px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                        <Building2 className="size-3 text-primary" />
                        {c.company}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary">
                      <Mail className="size-3" />
                      {c.email}
                    </span>
                    <span>·</span>
                    <span className="font-code text-[10px] text-muted-foreground">
                      ID: {c.userId}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(c.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>
                </div>

                {/* Project Stats badges */}
                <div className="flex items-center gap-3">
                  <div className="border border-border/80 bg-secondary/40 px-3 py-2 text-center">
                    <p className="font-code text-[9px] text-muted-foreground uppercase">
                      {adminText(language, 'طلبات الطباعة', 'Print Orders')}
                    </p>
                    <p className="font-display text-sm font-bold text-foreground">
                      {c.stats.totalPrintRequests}
                    </p>
                  </div>

                  <div className="border border-border/80 bg-secondary/40 px-3 py-2 text-center">
                    <p className="font-code text-[9px] text-muted-foreground uppercase">
                      {adminText(language, 'الاستشارات', 'Consultations')}
                    </p>
                    <p className="font-display text-sm font-bold text-foreground">
                      {c.stats.totalConsultations}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
