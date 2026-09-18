import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import { Link } from 'wouter';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Edit3,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Layers,
  Link2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { adminText, type Language } from './admin-dashboard-shell';
import type { ServiceDetail, ServiceGalleryItem } from '@workspace/api-zod';

export interface AdminServiceItem extends ServiceDetail {
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

const ACCENT_PRESETS = [
  { name: 'Cyan', value: 'cyan', hex: '#06b6d4' },
  { name: 'Blue', value: 'blue', hex: '#3b82f6' },
  { name: 'Violet', value: 'violet', hex: '#8b5cf6' },
  { name: 'Amber', value: 'amber', hex: '#f59e0b' },
  { name: 'Emerald', value: 'emerald', hex: '#10b981' },
  { name: 'Rose', value: 'rose', hex: '#f43f5e' },
];

function createBlankGalleryItem(index: number): ServiceGalleryItem {
  return {
    image: '',
    titleAr: `نموذج دراسة الحالة 0${index + 1}`,
    titleEn: `Case Study 0${index + 1}`,
    descriptionAr: 'وصف تفصيلي لأحد النماذج أو المشاريع الهندسية المنفذة.',
    descriptionEn: 'Detailed description of a delivered engineering project or prototype.',
  };
}

function createBlankService(): AdminServiceItem {
  return {
    slug: '',
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    category: 'Machine design',
    duration: '2–4 weeks',
    accent: 'cyan',
    highlightsAr: ['تصميم هندسي متكامل ومطابق للمعايير', 'محاكاة حركة واختبار إجهادات', 'ملفات إنتاج جاهزة للتصنيع'],
    highlightsEn: ['Full engineering design compliant with standards', 'Motion simulation and stress testing', 'Production-ready manufacturing files'],
    workflowAr: ['دراسة المتطلبات الفنية والبيئة التشغيلية', 'التصميم الأولي والمراجعة الهندسية', 'المحاكاة والتحليل الديناميكي', 'إعداد الرسومات التنفيذية وتوثيق المواد', 'التسليم والدعم الفني للتصنيع'],
    workflowEn: ['Technical requirements and operational assessment', 'Initial CAD concept and review', 'Dynamic simulation and stress analysis', 'Fabrication drawings and BOM documentation', 'Handover and manufacturing engineering support'],
    gallery: [createBlankGalleryItem(0), createBlankGalleryItem(1), createBlankGalleryItem(2)],
  };
}

export function AdminServicesPage({ language }: { language: Language }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formState, setFormState] = useState<AdminServiceItem>(createBlankService());
  const [activeTab, setActiveTab] = useState<'info' | 'highlights' | 'gallery' | 'preview'>('info');
  
  // Deletion modal
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  // Reset modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch all services
  const { data: services = [], isLoading, isFetching, refetch } = useQuery<AdminServiceItem[]>({
    queryKey: ['admin-services'],
    queryFn: () => customFetch<AdminServiceItem[]>('/api/admin/services'),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newService: AdminServiceItem) =>
      customFetch<AdminServiceItem>('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify(newService),
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsEditorOpen(false);
      showFeedback(
        'success',
        language === 'ar' ? `تم إضافة الخدمة "${saved.titleAr}" بنجاح` : `Service "${saved.titleEn}" created successfully`,
      );
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || (language === 'ar' ? 'حدث خطأ أثناء إضافة الخدمة' : 'Failed to create service'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: Partial<AdminServiceItem> }) =>
      customFetch<AdminServiceItem>(`/api/admin/services/${slug}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/services', saved.slug] });
      setIsEditorOpen(false);
      showFeedback(
        'success',
        language === 'ar' ? `تم تحديث الخدمة "${saved.titleAr}" بنجاح` : `Service "${saved.titleEn}" updated successfully`,
      );
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || (language === 'ar' ? 'حدث خطأ أثناء تعديل الخدمة' : 'Failed to update service'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (slug: string) =>
      customFetch<{ success: boolean; message: string }>(`/api/admin/services/${slug}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setDeleteSlug(null);
      showFeedback('success', language === 'ar' ? 'تم حذف الخدمة بنجاح' : 'Service deleted successfully');
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || (language === 'ar' ? 'فشل حذف الخدمة' : 'Failed to delete service'));
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: () =>
      customFetch<{ success: boolean; services: AdminServiceItem[] }>('/api/admin/services/reset', {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsResetConfirmOpen(false);
      showFeedback('success', language === 'ar' ? 'تم استعادة الخدمات الافتراضية بنجاح' : 'Default services restored successfully');
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || (language === 'ar' ? 'فشل استعادة الخدمات الافتراضية' : 'Failed to reset services'));
    },
  });

  // Open editor for new service
  const handleAddNew = () => {
    setEditingSlug(null);
    setFormState(createBlankService());
    setActiveTab('info');
    setIsEditorOpen(true);
  };

  // Open editor for existing service
  const handleEdit = (service: AdminServiceItem) => {
    setEditingSlug(service.slug);
    // Ensure gallery has 3 items
    const gallery = [...(service.gallery || [])];
    while (gallery.length < 3) {
      gallery.push(createBlankGalleryItem(gallery.length));
    }
    setFormState({
      ...service,
      gallery: gallery.slice(0, 3),
      highlightsAr: [...(service.highlightsAr || [])],
      highlightsEn: [...(service.highlightsEn || [])],
      workflowAr: [...(service.workflowAr || [])],
      workflowEn: [...(service.workflowEn || [])],
    });
    setActiveTab('info');
    setIsEditorOpen(true);
  };

  // Save form handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.titleAr.trim() || !formState.titleEn.trim()) {
      showFeedback('error', language === 'ar' ? 'يرجى كتابة عنوان الخدمة بالعربية والإنجليزية' : 'Please provide titles in Arabic and English');
      return;
    }

    const gallery = [...(formState.gallery || [])];
    while (gallery.length < 3) {
      gallery.push(createBlankGalleryItem(gallery.length));
    }

    const payload = {
      ...formState,
      gallery: gallery.slice(0, 3),
    };

    if (editingSlug) {
      updateMutation.mutate({ slug: editingSlug, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Helper for gallery updates
  const updateGalleryItem = (index: number, key: keyof ServiceGalleryItem, val: string) => {
    setFormState((prev) => {
      const nextGallery = [...(prev.gallery || [createBlankGalleryItem(0), createBlankGalleryItem(1), createBlankGalleryItem(2)])];
      while (nextGallery.length < 3) {
        nextGallery.push(createBlankGalleryItem(nextGallery.length));
      }
      nextGallery[index] = {
        ...nextGallery[index],
        [key]: val,
      };
      return { ...prev, gallery: nextGallery.slice(0, 3) };
    });
  };

  // Categories list for filtering
  const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));

  // Filtered services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.titleAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.titleEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-5 z-50 flex items-center gap-3 border px-5 py-3 shadow-xl transition-all ${
            feedback.type === 'success'
              ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-200'
              : 'border-destructive/50 bg-destructive/90 text-destructive-foreground'
          } ${language === 'ar' ? 'left-5' : 'right-5'}`}
        >
          {feedback.type === 'success' ? <Check className="size-5" /> : <AlertTriangle className="size-5" />}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-code text-xs text-primary">
            <Layers className="size-4" />
            <span>05 / {language === 'ar' ? 'إدارة الخدمات الهندسية' : 'SERVICES MANAGEMENT'}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {language === 'ar' ? 'إدارة خدمات الموقع والمعارض' : 'Services & Gallery Management'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {language === 'ar'
              ? 'التحكم في بطاقات الخدمات الست، إضافة خدمات جديدة، وتعيين روابط صور المعارض (3 صور لكل خدمة) مباشرة عبر URL.'
              : 'Control the services cards, create new services, and set gallery images (3 images per service) directly via external URLs.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-10 items-center gap-2 border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
            title={language === 'ar' ? 'تحديث البيانات' : 'Refresh'}
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex h-10 items-center gap-2 border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-semibold text-amber-400 transition-colors hover:border-amber-500/60"
            title={language === 'ar' ? 'استعادة الخدمات الافتراضية' : 'Reset to default services'}
          >
            <RotateCcw className="size-3.5" />
            <span>{language === 'ar' ? 'الافتراضيات' : 'Reset Defaults'}</span>
          </button>

          <button
            type="button"
            onClick={handleAddNew}
            className="flex h-10 items-center gap-2 bg-primary px-4 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
          >
            <Plus className="size-4" />
            <span>{language === 'ar' ? 'إضافة خدمة جديدة' : 'Add New Service'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className={`absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ${language === 'ar' ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث بالاسم، الرابط، أو الفئة...' : 'Search by title, slug, or category...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`h-10 w-full border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none ${
              language === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'
            }`}
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`border px-3 py-1.5 font-code text-xs transition-colors ${
              selectedCategory === 'all'
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border bg-card text-muted-foreground hover:border-border/80'
            }`}
          >
            {language === 'ar' ? 'الكل' : 'All'} ({services.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`border px-3 py-1.5 font-code text-xs transition-colors ${
                selectedCategory === cat
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-card text-muted-foreground hover:border-border/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse border border-border bg-card/60 p-6" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
          <Layers className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            {language === 'ar' ? 'لا توجد خدمات مطابقة' : 'No services found'}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {language === 'ar'
              ? 'جرّب البحث بكلمات أخرى أو أضف خدمة جديدة عبر الزر أعلاه.'
              : 'Try a different search query or add a new service using the button above.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service, index) => {
            const primaryImage = service.gallery?.[0]?.image || '/media/why-we-1.jpeg';
            return (
              <div
                key={service.slug}
                className="group relative flex flex-col justify-between border border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                style={{ borderTopColor: service.accent || undefined, borderTopWidth: 2 }}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-border/60 p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-code text-xs font-semibold text-primary">
                        0{index + 1}
                      </span>
                      <span className="border border-border bg-secondary/60 px-2 py-0.5 font-code text-[10px] text-muted-foreground">
                        {service.category}
                      </span>
                    </div>
                    <span className="font-code text-[11px] text-muted-foreground">
                      {service.duration}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {language === 'ar' ? service.titleAr : service.titleEn}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-primary/80">
                      /services/{service.slug}
                    </p>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {language === 'ar' ? service.descriptionAr : service.descriptionEn}
                    </p>

                    {/* Gallery Thumbnails Strip */}
                    <div className="mt-5 border-t border-border/50 pt-4">
                      <div className="mb-2 flex items-center justify-between font-code text-[10px] text-muted-foreground">
                        <span>{language === 'ar' ? 'معرض الصور (3 صور)' : 'Gallery (3 items)'}</span>
                        <span className="text-primary">{service.gallery?.length || 0} / 3</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((gIndex) => {
                          const item = service.gallery?.[gIndex];
                          const hasUrl = Boolean(item?.image);
                          return (
                            <div
                              key={gIndex}
                              className="group/img relative aspect-[16/10] overflow-hidden border border-border bg-background"
                            >
                              {hasUrl ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="size-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                  onError={(e) => {
                                    // Fallback if URL is invalid
                                    (e.currentTarget as HTMLImageElement).src = '/media/why-we-1.jpeg';
                                  }}
                                />
                              ) : (
                                <div className="flex size-full flex-col items-center justify-center bg-secondary/30 p-1 text-center">
                                  <ImageIcon className="size-3.5 text-muted-foreground/40" />
                                  <span className="font-code text-[8px] text-muted-foreground/60">
                                    No URL
                                  </span>
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 bg-background/80 px-1 font-code text-[8px] text-foreground">
                                0{gIndex + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between border-t border-border bg-secondary/30 p-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/services/${service.slug}`}
                      target="_blank"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-muted-foreground transition-colors hover:text-primary"
                      title={language === 'ar' ? 'عرض الصفحة العامة' : 'View public service page'}
                    >
                      <Eye className="size-3.5" />
                      <span>{language === 'ar' ? 'معاينة' : 'View'}</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(service)}
                      className="flex items-center gap-1 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <Edit3 className="size-3.5" />
                      <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteSlug(service.slug)}
                      className="flex items-center gap-1 px-2.5 py-1 text-muted-foreground transition-colors hover:text-destructive"
                      title={language === 'ar' ? 'حذف الخدمة' : 'Delete service'}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* Service Editor Modal (Add / Edit)                         */}
      {/* ======================================================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col border border-border bg-[#071126] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
              <div>
                <span className="font-code text-[11px] text-primary">
                  {editingSlug
                    ? language === 'ar'
                      ? 'تعديل الخدمة'
                      : 'EDIT SERVICE'
                    : language === 'ar'
                      ? 'إضافة خدمة جديدة'
                      : 'NEW SERVICE'}
                </span>
                <h2 className="font-display text-xl font-bold text-foreground">
                  {editingSlug
                    ? language === 'ar'
                      ? formState.titleAr || 'تعديل الخدمة'
                      : formState.titleEn || 'Edit Service'
                    : language === 'ar'
                      ? 'خدمة هندسية جديدة'
                      : 'Create Engineering Service'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex overflow-x-auto border-b border-border bg-card/40 px-4 sm:px-6">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 font-code text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'info'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>01</span>
                <span>{language === 'ar' ? 'البيانات الأساسية' : 'Basic Info'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('highlights')}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 font-code text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'highlights'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>02</span>
                <span>{language === 'ar' ? 'المخرجات ومراحل العمل' : 'Outcomes & Workflow'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 font-code text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'gallery'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>03</span>
                <span>{language === 'ar' ? 'معرض الصور (3 روابط URL)' : '3-Image Gallery (URLs)'}</span>
                <span className="size-1.5 rounded-full bg-primary" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 font-code text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'preview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>04</span>
                <span>{language === 'ar' ? 'معاينة حية' : 'Live Preview'}</span>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* TAB 1: BASIC INFO */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block font-code text-xs font-semibold text-foreground">
                          {language === 'ar' ? 'عنوان الخدمة (بالعربية) *' : 'Service Title (Arabic) *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={formState.titleAr}
                          onChange={(e) => setFormState({ ...formState, titleAr: e.target.value })}
                          placeholder="مثال: آلات التعبئة والتغليف"
                          className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block font-code text-xs font-semibold text-foreground">
                          {language === 'ar' ? 'عنوان الخدمة (بالإنجليزية) *' : 'Service Title (English) *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={formState.titleEn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormState({
                              ...formState,
                              titleEn: val,
                              // Auto-generate slug if new service and slug empty
                              slug:
                                !editingSlug && !formState.slug
                                  ? val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                                  : formState.slug,
                            });
                          }}
                          placeholder="e.g. Packaging & Filling Machines"
                          className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block font-code text-xs font-semibold text-foreground">
                          {language === 'ar' ? 'معرف الرابط (Slug) *' : 'URL Slug *'}
                        </label>
                        <input
                          type="text"
                          required
                          disabled={Boolean(editingSlug)}
                          value={formState.slug}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''),
                            })
                          }
                          placeholder="packaging-filling-machines"
                          className="h-10 w-full border border-border bg-card px-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                        />
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {language === 'ar' ? 'مسار الصفحة: /services/:slug' : 'Path: /services/:slug'}
                        </span>
                      </div>

                      <div>
                        <label className="mb-1.5 block font-code text-xs font-semibold text-foreground">
                          {language === 'ar' ? 'تصنيف الخدمة (Category)' : 'Category'}
                        </label>
                        <input
                          type="text"
                          value={formState.category}
                          onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                          placeholder="Machine design / Precision parts..."
                          className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block font-code text-xs font-semibold text-foreground">
                          {language === 'ar' ? 'المدة التقديرية (Duration)' : 'Estimated Duration'}
                        </label>
                        <input
                          type="text"
                          value={formState.duration}
                          onChange={(e) => setFormState({ ...formState, duration: e.target.value })}
                          placeholder="3–6 weeks / 2–4 weeks"
                          className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Accent Color Selection */}
                    <div>
                      <label className="mb-2 block font-code text-xs font-semibold text-foreground">
                        {language === 'ar' ? 'لون التمييز (Accent Color)' : 'Accent Color'}
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        {ACCENT_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setFormState({ ...formState, accent: preset.value })}
                            className={`flex items-center gap-2 border px-3 py-1.5 font-code text-xs transition-all ${
                              formState.accent === preset.value
                                ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span
                              className="size-3 rounded-full"
                              style={{ backgroundColor: preset.hex }}
                            />
                            <span>{preset.name}</span>
                          </button>
                        ))}
                        <input
                          type="text"
                          value={formState.accent}
                          onChange={(e) => setFormState({ ...formState, accent: e.target.value })}
                          placeholder="#06b6d4 or custom"
                          className="h-9 w-32 border border-border bg-card px-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Descriptions */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block font-code text-xs font-semibold text-foreground">
                          {language === 'ar' ? 'الوصف المختصر (بالعربية)' : 'Description (Arabic)'}
                        </label>
                        <textarea
                          rows={4}
                          value={formState.descriptionAr}
                          onChange={(e) => setFormState({ ...formState, descriptionAr: e.target.value })}
                          placeholder="وصف واضح ومباشر لما تقدمه هذه الخدمة في المصنع وخطوط الإنتاج..."
                          className="w-full border border-border bg-card p-3 text-sm leading-relaxed text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block font-code text-xs font-semibold text-foreground">
                          {language === 'ar' ? 'الوصف المختصر (بالإنجليزية)' : 'Description (English)'}
                        </label>
                        <textarea
                          rows={4}
                          value={formState.descriptionEn}
                          onChange={(e) => setFormState({ ...formState, descriptionEn: e.target.value })}
                          placeholder="Concise overview of engineering value delivered on the production floor..."
                          className="w-full border border-border bg-card p-3 text-sm leading-relaxed text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: HIGHLIGHTS & WORKFLOW */}
                {activeTab === 'highlights' && (
                  <div className="space-y-8">
                    {/* Highlights (What you get) */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-display text-base font-bold text-foreground">
                            {language === 'ar' ? 'ما الذي ستحصل عليه؟ (المخرجات - Highlights)' : 'What you will get (Highlights)'}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar'
                              ? 'النقاط التي تظهر في قسم OUTCOME / 01 بصفحة تفاصيل الخدمة.'
                              : 'Bulleted outcome checklist rendered in the OUTCOME / 01 section of the service detail page.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormState({
                              ...formState,
                              highlightsAr: [...formState.highlightsAr, 'مخرج هندسي جديد'],
                              highlightsEn: [...formState.highlightsEn, 'New engineering deliverable'],
                            })
                          }
                          className="flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="size-3.5" />
                          <span>{language === 'ar' ? 'إضافة نقطة' : 'Add Point'}</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {formState.highlightsAr.map((hAr, idx) => (
                          <div key={idx} className="flex items-start gap-2 border border-border/80 bg-card/60 p-3">
                            <span className="mt-2 font-code text-xs text-primary font-bold">
                              0{idx + 1}
                            </span>
                            <div className="grid flex-1 gap-2 sm:grid-cols-2">
                              <input
                                type="text"
                                value={hAr}
                                onChange={(e) => {
                                  const next = [...formState.highlightsAr];
                                  next[idx] = e.target.value;
                                  setFormState({ ...formState, highlightsAr: next });
                                }}
                                placeholder="النص بالعربية"
                                className="h-9 border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                              />
                              <input
                                type="text"
                                value={formState.highlightsEn[idx] || ''}
                                onChange={(e) => {
                                  const next = [...formState.highlightsEn];
                                  next[idx] = e.target.value;
                                  setFormState({ ...formState, highlightsEn: next });
                                }}
                                placeholder="Text in English"
                                className="h-9 border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextAr = formState.highlightsAr.filter((_, i) => i !== idx);
                                const nextEn = formState.highlightsEn.filter((_, i) => i !== idx);
                                setFormState({ ...formState, highlightsAr: nextAr, highlightsEn: nextEn });
                              }}
                              className="mt-1 text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Workflow Steps */}
                    <div className="border-t border-border pt-6">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-display text-base font-bold text-foreground">
                            {language === 'ar' ? 'مراحل خطة العمل (Workflow)' : 'Workflow Stages'}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar'
                              ? 'المراحل المرقمة في قسم WORKFLOW / 02 بصفحة تفاصيل الخدمة.'
                              : 'Numbered stages displayed in the WORKFLOW / 02 section of the service detail page.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormState({
                              ...formState,
                              workflowAr: [...formState.workflowAr, 'مرحلة عمل إضافية'],
                              workflowEn: [...formState.workflowEn, 'Additional workflow stage'],
                            })
                          }
                          className="flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="size-3.5" />
                          <span>{language === 'ar' ? 'إضافة مرحلة' : 'Add Stage'}</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {formState.workflowAr.map((wAr, idx) => (
                          <div key={idx} className="flex items-start gap-2 border border-border/80 bg-card/60 p-3">
                            <span className="mt-2 font-code text-xs text-primary font-bold">
                              0{idx + 1}
                            </span>
                            <div className="grid flex-1 gap-2 sm:grid-cols-2">
                              <input
                                type="text"
                                value={wAr}
                                onChange={(e) => {
                                  const next = [...formState.workflowAr];
                                  next[idx] = e.target.value;
                                  setFormState({ ...formState, workflowAr: next });
                                }}
                                placeholder="وصف المرحلة بالعربية"
                                className="h-9 border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                              />
                              <input
                                type="text"
                                value={formState.workflowEn[idx] || ''}
                                onChange={(e) => {
                                  const next = [...formState.workflowEn];
                                  next[idx] = e.target.value;
                                  setFormState({ ...formState, workflowEn: next });
                                }}
                                placeholder="Stage description in English"
                                className="h-9 border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextAr = formState.workflowAr.filter((_, i) => i !== idx);
                                const nextEn = formState.workflowEn.filter((_, i) => i !== idx);
                                setFormState({ ...formState, workflowAr: nextAr, workflowEn: nextEn });
                              }}
                              className="mt-1 text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: 3-IMAGE GALLERY (URL INPUTS) */}
                {activeTab === 'gallery' && (
                  <div className="space-y-8">
                    <div className="border-l-2 border-primary bg-primary/5 p-4 text-xs leading-relaxed text-foreground">
                      <p className="font-semibold text-primary">
                        {language === 'ar' ? 'معرض صور الخدمة (3 صور فقط عبر روابط URL):' : '3-Image Project Gallery (URL inputs):'}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {language === 'ar'
                          ? 'يمكنك وضع رابط الصورة المباشر من منصة الرفع الخارجية (Imgur, Cloudinary, S3, أو أي استضافة صور). لا يتم رفع ملفات على السيرفر بل تعيين الروابط الخارجية مباشرة. تظهر الصورة الأولى في البطاقة الكبرى (Case 01)، والصورتان التاليتان على الجانب الأيمن (Case 02 و Case 03).'
                          : 'Paste direct image URLs from your third-party image host. No server file uploads needed. Image 01 renders as the primary large hero card (Case 01), while Images 02 and 03 render as the secondary stacked cards.'}
                      </p>
                    </div>

                    {[0, 1, 2].map((gIndex) => {
                      const item = formState.gallery[gIndex] || createBlankGalleryItem(gIndex);
                      const isHero = gIndex === 0;
                      return (
                        <div
                          key={gIndex}
                          className="border border-border bg-card p-5 transition-all hover:border-primary/40"
                        >
                          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2 font-code text-xs text-primary font-bold">
                              <span>CASE / 0{gIndex + 1}</span>
                              <span className="border border-border bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                {isHero
                                  ? language === 'ar'
                                    ? 'البطاقة الكبرى الرئيسية'
                                    : 'Primary Featured Card (Large)'
                                  : language === 'ar'
                                    ? 'البطاقة الجانبية'
                                    : 'Secondary Card'}
                              </span>
                            </div>
                            {item.image && (
                              <span className="font-code text-[10px] text-emerald-400">
                                {language === 'ar' ? '✓ تم تعيين الرابط' : '✓ URL Configured'}
                              </span>
                            )}
                          </div>

                          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
                            {/* Live Thumbnail Preview */}
                            <div className="flex flex-col gap-2">
                              <span className="font-code text-[10px] text-muted-foreground">
                                {language === 'ar' ? 'معاينة الصورة الحية' : 'Live Image Preview'}
                              </span>
                              <div className="relative aspect-[16/10] overflow-hidden border border-border bg-background">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.titleAr}
                                    className="size-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/media/why-we-1.jpeg';
                                    }}
                                  />
                                ) : (
                                  <div className="flex size-full flex-col items-center justify-center bg-secondary/20 p-2 text-center">
                                    <ImageIcon className="size-6 text-muted-foreground/30" />
                                    <span className="mt-1 font-code text-[9px] text-muted-foreground/50">
                                      {language === 'ar' ? 'ضع الرابط للمعاينة' : 'Paste URL to preview'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-3">
                              <div>
                                <label className="mb-1 flex items-center gap-1.5 font-code text-xs font-semibold text-foreground">
                                  <Link2 className="size-3.5 text-primary" />
                                  <span>{language === 'ar' ? `رابط الصورة 0${gIndex + 1} (Image URL) *` : `Image 0${gIndex + 1} URL *`}</span>
                                </label>
                                <input
                                  type="url"
                                  value={item.image}
                                  onChange={(e) => updateGalleryItem(gIndex, 'image', e.target.value)}
                                  placeholder="https://images.example.com/project-photo.jpg or /media/..."
                                  className="h-9 w-full border border-border bg-background px-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                                />
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block font-code text-[11px] text-muted-foreground">
                                    {language === 'ar' ? 'عنوان النموذج (بالعربية)' : 'Case Title (Arabic)'}
                                  </label>
                                  <input
                                    type="text"
                                    value={item.titleAr}
                                    onChange={(e) => updateGalleryItem(gIndex, 'titleAr', e.target.value)}
                                    placeholder="مثال: وحدة تعبئة سيرفو مخصصة"
                                    className="h-9 w-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block font-code text-[11px] text-muted-foreground">
                                    {language === 'ar' ? 'عنوان النموذج (بالإنجليزية)' : 'Case Title (English)'}
                                  </label>
                                  <input
                                    type="text"
                                    value={item.titleEn}
                                    onChange={(e) => updateGalleryItem(gIndex, 'titleEn', e.target.value)}
                                    placeholder="e.g. Custom servo filling station"
                                    className="h-9 w-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block font-code text-[11px] text-muted-foreground">
                                    {language === 'ar' ? 'وصف النموذج (بالعربية)' : 'Case Description (Arabic)'}
                                  </label>
                                  <input
                                    type="text"
                                    value={item.descriptionAr}
                                    onChange={(e) => updateGalleryItem(gIndex, 'descriptionAr', e.target.value)}
                                    placeholder="توضيح مختصر للمشروع الصناعي..."
                                    className="h-9 w-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block font-code text-[11px] text-muted-foreground">
                                    {language === 'ar' ? 'وصف النموذج (بالإنجليزية)' : 'Case Description (English)'}
                                  </label>
                                  <input
                                    type="text"
                                    value={item.descriptionEn}
                                    onChange={(e) => updateGalleryItem(gIndex, 'descriptionEn', e.target.value)}
                                    placeholder="Brief technical description..."
                                    className="h-9 w-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 4: LIVE PREVIEW */}
                {activeTab === 'preview' && (
                  <div className="space-y-8">
                    {/* Section 1: Home Page Card Preview */}
                    <div>
                      <h3 className="mb-1 font-display text-sm font-bold text-foreground">
                        {language === 'ar' ? 'معاينة بطاقة الخدمة في الصفحة الرئيسية:' : 'Home Page Service Card Preview:'}
                      </h3>
                      <p className="mb-4 text-xs text-muted-foreground">
                        {language === 'ar'
                          ? 'هذا هو الشكل الدقيق الذي تظهر به بطاقة الخدمة داخل شبكة الخدمات في الصفحة الرئيسية.'
                          : 'Exact visual rendering of the service card within the homepage capabilities section.'}
                      </p>

                      <div className="max-w-md">
                        <div
                          className="group relative overflow-hidden border border-border bg-card p-6 shadow-md"
                          style={{ borderTopColor: formState.accent || undefined, borderTopWidth: 2 }}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-code text-xs text-primary">
                              01 / {formState.category || 'Machine design'}
                            </span>
                            <ArrowUpRight className="size-4 text-muted-foreground" />
                          </div>
                          <div className="mt-10">
                            <h3 className="font-display text-2xl font-bold text-foreground">
                              {language === 'ar' ? formState.titleAr || 'عنوان الخدمة' : formState.titleEn || 'Service Title'}
                            </h3>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                              {language === 'ar'
                                ? formState.descriptionAr || 'وصف توضيحي للخدمة الهندسية...'
                                : formState.descriptionEn || 'Engineering service description...'}
                            </p>
                          </div>
                          <div className="mt-7 flex items-center justify-between border-t border-border pt-4 font-code text-[10px] text-muted-foreground">
                            <span>{formState.duration || '2–4 weeks'}</span>
                            <span className="text-primary">
                              {language === 'ar' ? 'اكتشف الخدمة ↗' : 'Explore service ↗'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: 3-Image Gallery Layout Preview */}
                    <div className="border-t border-border pt-6">
                      <h3 className="mb-1 font-display text-sm font-bold text-foreground">
                        {language === 'ar' ? 'معاينة معرض الصور الثلاث في صفحة الخدمة المستقلة:' : 'Service Detail Page 3-Image Gallery Preview:'}
                      </h3>
                      <p className="mb-4 text-xs text-muted-foreground">
                        {language === 'ar'
                          ? 'نفس التخطيط الهندسي المعتمد (بطاقة كبرى على اليسار وبطاقتان على اليمين).'
                          : 'Exact engineering layout (1 large card on the left, 2 stacked on the right).'}
                      </p>

                      <div dir="ltr" className="grid gap-3 lg:grid-cols-12 lg:grid-rows-2">
                        {formState.gallery.map((project, index) => (
                          <figure
                            key={index}
                            dir={language === 'ar' ? 'rtl' : 'ltr'}
                            className={`group relative overflow-hidden border border-border bg-card ${
                              index === 0 ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'
                            }`}
                          >
                            <img
                              src={project.image || '/media/why-we-1.jpeg'}
                              alt=""
                              className={`w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 ${
                                index === 0 ? 'h-full min-h-[220px]' : 'aspect-[16/10]'
                              }`}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/media/why-we-1.jpeg';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#071126] via-transparent to-transparent opacity-90" />
                            <figcaption className="absolute inset-x-0 bottom-0 p-4">
                              <div className="flex items-center justify-between gap-2 font-code text-[9px] tracking-wider text-primary">
                                <span>CASE / 0{index + 1}</span>
                                <span>{formState.category}</span>
                              </div>
                              <h4 className="mt-1 font-display text-base font-bold text-white">
                                {language === 'ar' ? project.titleAr : project.titleEn}
                              </h4>
                              <p className="mt-1 line-clamp-1 text-xs text-white/70">
                                {language === 'ar' ? project.descriptionAr : project.descriptionEn}
                              </p>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>

                <div className="flex items-center gap-3">
                  {activeTab !== 'preview' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className="flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
                    >
                      <Eye className="size-3.5" />
                      <span>{language === 'ar' ? 'معاينة الشكل النهائي' : 'Preview Result'}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex items-center gap-2 bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    <Check className="size-4" />
                    <span>
                      {createMutation.isPending || updateMutation.isPending
                        ? language === 'ar'
                          ? 'جاري الحفظ...'
                          : 'Saving...'
                        : editingSlug
                          ? language === 'ar'
                            ? 'حفظ التعديلات'
                            : 'Save Changes'
                          : language === 'ar'
                            ? 'إنشاء الخدمة'
                            : 'Create Service'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Delete Confirmation Modal                                 */}
      {/* ======================================================== */}
      {deleteSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-destructive/40 bg-[#071126] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-6" />
              <h3 className="font-display text-lg font-bold">
                {language === 'ar' ? 'تأكيد حذف الخدمة' : 'Confirm Deletion'}
              </h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف الخدمة "${deleteSlug}" نهائياً من الموقع؟ سيتم إزالة بطاقتها من الصفحة الرئيسية وصفحتها المخصصة.`
                : `Are you sure you want to permanently delete service "${deleteSlug}"? Its card will be removed from the homepage and its detail page will be unpublished.`}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteSlug(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteSlug)}
                className="flex items-center gap-2 bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              >
                <Trash2 className="size-3.5" />
                <span>
                  {deleteMutation.isPending
                    ? language === 'ar'
                      ? 'جاري الحذف...'
                      : 'Deleting...'
                    : language === 'ar'
                      ? 'نعم، احذف الخدمة'
                      : 'Yes, Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Reset to Defaults Confirmation Modal                     */}
      {/* ======================================================== */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-amber-500/40 bg-[#071126] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="size-6" />
              <h3 className="font-display text-lg font-bold">
                {language === 'ar' ? 'استعادة الخدمات الافتراضية' : 'Restore Default Services'}
              </h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {language === 'ar'
                ? 'سيؤدي هذا الإجراء إلى إعادة تعيين قائمة الخدمات إلى الخدمات الصناعية الست الأصلية المجهزة بالكامل. هل تريد المتابعة؟'
                : 'This action will reset the service list back to the original 6 pre-configured engineering services. Do you wish to continue?'}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={resetMutation.isPending}
                onClick={() => resetMutation.mutate()}
                className="flex items-center gap-2 bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-60"
              >
                <RotateCcw className="size-3.5" />
                <span>
                  {resetMutation.isPending
                    ? language === 'ar'
                      ? 'جاري الاستعادة...'
                      : 'Restoring...'
                    : language === 'ar'
                      ? 'استعادة الآن'
                      : 'Restore Now'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminServicesPage;
