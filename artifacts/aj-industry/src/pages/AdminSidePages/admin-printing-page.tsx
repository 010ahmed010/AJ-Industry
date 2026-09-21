import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCode,
  Filter,
  Layers,
  MessageSquare,
  Printer,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  User,
  X,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import {
  adminText,
  StatusBadge,
  type AdminPrintRequest,
  type Language,
} from './admin-dashboard-shell';

export function AdminPrintingPage({ language }: { language: Language }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminPrintRequest | null>(null);

  // Edit modal state
  const [editStatus, setEditStatus] = useState<AdminPrintRequest['status']>('submitted');
  const [editQuoteAmount, setEditQuoteAmount] = useState<string>('');
  const [editQuoteCurrency, setEditQuoteCurrency] = useState<string>('USD');
  const [editDeliveryDate, setEditDeliveryDate] = useState<string>('');
  const [editFeedback, setEditFeedback] = useState<string>('');

  const { data: requests = [], isLoading, isFetching, refetch } = useQuery<AdminPrintRequest[]>({
    queryKey: ['admin-requests', statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      return customFetch<AdminPrintRequest[]>(`/api/admin/requests?${params.toString()}`);
    },
    refetchInterval: 8_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status: AdminPrintRequest['status'];
      quoteAmount?: number;
      quoteCurrency?: string;
      estimatedDelivery?: string;
      adminFeedback?: string;
    }) => {
      return customFetch(`/api/admin/requests/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['client-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['client-overview'] });
      setSelectedOrder(null);
    },
  });

  const [orderToDelete, setOrderToDelete] = useState<AdminPrintRequest | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return customFetch(`/api/admin/requests/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['client-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['client-overview'] });
      setOrderToDelete(null);
      setSelectedOrder(null);
    },
  });

  const toggleSuspend = (order: AdminPrintRequest) => {
    const isCurrentlySuspended = order.status === 'suspended';
    const nextStatus = isCurrentlySuspended ? 'reviewing' : 'suspended';
    updateMutation.mutate({
      id: order.id,
      status: nextStatus,
      adminFeedback: isCurrentlySuspended
        ? (order.adminFeedback || 'تم استئناف الطلب للمراجعة الهندسية')
        : (order.adminFeedback || 'تم تعليق الطلب مؤقتاً لمراجعة المتطلبات مع العميل'),
    });
  };

  const openEditModal = (order: AdminPrintRequest) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditQuoteAmount(order.quoteAmount !== undefined ? String(order.quoteAmount) : '');
    setEditQuoteCurrency(order.quoteCurrency || 'USD');
    setEditDeliveryDate(order.estimatedDelivery ? order.estimatedDelivery.slice(0, 10) : '');
    setEditFeedback(order.adminFeedback || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    updateMutation.mutate({
      id: selectedOrder.id,
      status: editStatus,
      quoteAmount: editQuoteAmount ? Number(editQuoteAmount) : undefined,
      quoteCurrency: editQuoteCurrency,
      estimatedDelivery: editDeliveryDate || undefined,
      adminFeedback: editFeedback || undefined,
    });
  };

  const filterTabs = [
    { key: 'all', labelAr: 'الكل', labelEn: 'All' },
    { key: 'submitted', labelAr: 'تم الاستلام', labelEn: 'Submitted' },
    { key: 'reviewing', labelAr: 'قيد المراجعة', labelEn: 'Review' },
    { key: 'quoted', labelAr: 'تم التسعير', labelEn: 'Quoted' },
    { key: 'in_queue', labelAr: 'طابور الإنتاج', labelEn: 'In Queue' },
    { key: 'scheduled', labelAr: 'مجدول للإنتاج', labelEn: 'Scheduled' },
    { key: 'completed', labelAr: 'مكتمل', labelEn: 'Completed' },
    { key: 'suspended', labelAr: 'معلّق مؤقتاً', labelEn: 'Suspended' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="font-code text-[10px] tracking-[.2em] text-primary">
            ADMIN / 02 — 3D PRINTING WORK ORDERS
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {adminText(language, 'إدارة طلبات الطباعة ثلاثية الأبعاد', '3D Print Orders Management')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminText(
              language,
              'حدد الأسعار الهندسية، مواعيد التسليم، وملاحظات الإنتاج لكل طلب عميل. التحديثات تظهر فوراً للعميل في لوحته.',
              'Set prices, delivery dates, and engineering notes. Changes update in the client dashboard immediately.',
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

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-4 border border-border bg-[#0b1528] p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1">
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

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={adminText(language, 'بحث بالمشروع أو المرجع أو العميل…', 'Search project, ref, client…')}
            className="h-9 w-full border border-border bg-secondary/30 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="مسح"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="border border-border bg-[#0b1528]">
        <div className="border-b border-border/80 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary" />
            <p className="font-code text-xs text-muted-foreground">
              {requests.length} {adminText(language, 'طلب مسجل في النظام', 'orders in database')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {adminText(language, 'جارٍ جلب الطلبات من قاعدة البيانات…', 'Loading orders from database…')}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <Printer className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-display text-base font-bold text-foreground">
              {adminText(language, 'لا توجد طلبات طباعة مطابقة', 'No matching print orders')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {adminText(
                language,
                'يمكنك التبديل إلى مساحة العميل وإرسال طلب تجريبي لمشاهدة التزامن المباشر.',
                'Switch to the Client View and create an order to see live real-time synchronization.',
              )}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-3 text-xs text-primary underline hover:text-primary/80"
              >
                {adminText(language, 'مسح البحث', 'Clear search')}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-[620px] overflow-y-auto overscroll-contain">
            {requests.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-secondary/20 lg:flex-row lg:items-center lg:justify-between"
              >
                {/* Order Information */}
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={order.status}
                      statusAr={order.statusAr}
                      statusEn={order.statusEn}
                      language={language}
                    />
                    <span className="font-code text-xs text-primary font-bold">{order.reference}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-foreground">
                    {order.projectName}
                  </h3>

                  {/* Specs row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {adminText(language, 'المادة:', 'Material:')}{' '}
                      <strong className="text-foreground">{order.material}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      {adminText(language, 'الكمية:', 'Quantity:')}{' '}
                      <strong className="text-foreground">{order.quantity} {adminText(language, 'قطعة', 'pcs')}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      {adminText(language, 'التشطيب:', 'Finish:')}{' '}
                      <strong className="text-foreground">{order.finish}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      {adminText(language, 'الجدول:', 'Timeline:')}{' '}
                      <strong className="text-foreground">{order.timeline}</strong>
                    </span>
                    {order.fileName && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-primary">
                          <FileCode className="size-3.5" />
                          {order.fileName}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Client identity */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="size-3.5 text-primary" />
                    <span className="font-semibold text-foreground">{order.client.name}</span>
                    {order.client.company && (
                      <span className="border border-border/80 bg-secondary/50 px-1.5 py-0.5 font-code text-[10px]">
                        {order.client.company}
                      </span>
                    )}
                    <span>({order.client.email})</span>
                  </div>

                  {/* Quote or Admin Feedback if present */}
                  {(order.quoteAmount !== undefined || order.adminFeedback) && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border/40 pt-2 text-xs">
                      {order.quoteAmount !== undefined && (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <DollarSign className="size-3.5" />
                          {adminText(language, 'التسعير المعتمد:', 'Quoted:')} {order.quoteAmount} {order.quoteCurrency || 'USD'}
                        </span>
                      )}
                      {order.estimatedDelivery && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Clock className="size-3.5" />
                          {adminText(language, 'التسليم المتوقع:', 'Est. Delivery:')} {new Date(order.estimatedDelivery).toLocaleDateString()}
                        </span>
                      )}
                      {order.adminFeedback && (
                        <span className="text-muted-foreground italic truncate max-w-md">
                          "{order.adminFeedback}"
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(order)}
                    className="flex h-10 items-center gap-2 bg-primary px-3.5 font-code text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    <DollarSign className="size-3.5" />
                    <span>{adminText(language, 'تسعير / تحديث', 'Price & Update')}</span>
                  </button>

                  {/* Quick Suspend / Resume Button */}
                  <button
                    type="button"
                    onClick={() => toggleSuspend(order)}
                    title={order.status === 'suspended' ? adminText(language, 'استئناف الطلب', 'Resume Request') : adminText(language, 'تعليق الطلب', 'Suspend Request')}
                    className={`flex h-10 items-center gap-1.5 border px-3 font-code text-xs font-semibold transition-colors ${
                      order.status === 'suspended'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    }`}
                  >
                    {order.status === 'suspended' ? (
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

                  {/* Delete Request Button */}
                  <button
                    type="button"
                    onClick={() => setOrderToDelete(order)}
                    title={adminText(language, 'حذف الطلب نهائياً', 'Delete Request')}
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

      {/* Edit / Quote Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col border border-border bg-[#0b1528] shadow-2xl">
            {/* Modal Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-border p-5 sm:p-6">
              <div>
                <span className="font-code text-[10px] tracking-[.2em] text-primary">
                  ADMIN ACTION / {selectedOrder.reference}
                </span>
                <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                  {adminText(language, 'تحديث وتسعير الطلب', 'Update & Quote Order')}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedOrder.projectName} — {selectedOrder.client.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="grid size-8 place-items-center border border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto p-5 sm:p-6">
              {/* Status Select */}
              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'حالة الطلب', 'Workflow Status')}
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="submitted">{adminText(language, 'تم الاستلام (Submitted)', 'Submitted / Received')}</option>
                  <option value="reviewing">{adminText(language, 'قيد المراجعة الهندسية (Reviewing)', 'Reviewing')}</option>
                  <option value="quoted">{adminText(language, 'تم التسعير (Quoted)', 'Quoted')}</option>
                  <option value="in_queue">{adminText(language, 'طابور التنفيذ (In Queue)', 'In Queue')}</option>
                  <option value="scheduled">{adminText(language, 'مجدول للإنتاج (Scheduled)', 'Scheduled for production')}</option>
                  <option value="completed">{adminText(language, 'مكتمل وجاهز للتسليم (Completed)', 'Completed')}</option>
                  <option value="suspended">{adminText(language, 'معلّق مؤقتاً (Suspended)', 'Suspended / On-Hold')}</option>
                </select>
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                    {adminText(language, 'قيمة التسعير', 'Quote Amount')}
                  </label>
                  <div className="relative mt-1.5">
                    <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editQuoteAmount}
                      onChange={(e) => setEditQuoteAmount(e.target.value)}
                      placeholder="e.g. 450.00"
                      className="h-10 w-full border border-border bg-secondary/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                    {adminText(language, 'العملة', 'Currency')}
                  </label>
                  <select
                    value={editQuoteCurrency}
                    onChange={(e) => setEditQuoteCurrency(e.target.value)}
                    className="mt-1.5 h-10 w-full border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="SAR">SAR (ر.س)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Estimated Delivery */}
              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'موعد التسليم المتوقع', 'Estimated Delivery Date')}
                </label>
                <div className="relative mt-1.5">
                  <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    className="h-10 w-full border border-border bg-secondary/40 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Admin Feedback / Engineering Notes */}
              <div>
                <label className="block font-code text-xs uppercase tracking-wider text-muted-foreground">
                  {adminText(language, 'ملاحظات المهندس المشرف (تظهر للعميل)', 'Engineering Feedback (Visible to client)')}
                </label>
                <textarea
                  rows={3}
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  placeholder={adminText(
                    language,
                    'أدخل توجيهات التصنيع، دقة الطبقة، أو تفاصيل الشحن…',
                    'Manufacturing instructions, layer height notes, shipping details…',
                  )}
                  className="mt-1.5 w-full border border-border bg-secondary/40 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    const order = selectedOrder;
                    setSelectedOrder(null);
                    setOrderToDelete(order);
                  }}
                  className="flex items-center gap-1.5 border border-rose-500/40 bg-rose-500/10 px-3 py-2 font-code text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                >
                  <Trash2 className="size-3.5" />
                  <span>{adminText(language, 'حذف الطلب', 'Delete Order')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
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
                    <span>{adminText(language, 'حفظ وتحديث العميل', 'Save & Update Client')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
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
                  {adminText(language, 'تأكيد حذف طلب الطباعة', 'Confirm Delete Print Request')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {adminText(
                    language,
                    `هل أنت متأكد من حذف الطلب "${orderToDelete.projectName}" (المرجع: ${orderToDelete.reference})؟ سيتم حذفه نهائياً من قاعدة البيانات.`,
                    `Are you sure you want to permanently delete order "${orderToDelete.projectName}" (${orderToDelete.reference})? This action cannot be undone.`,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={deleteMutation.isPending}
                className="h-9 border border-border px-4 font-code text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {adminText(language, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(orderToDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex h-9 items-center gap-2 border border-rose-500/60 bg-rose-600 px-4 font-code text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>{adminText(language, 'نعم، احذف الطلب', 'Yes, Delete Request')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
