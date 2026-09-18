import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Navigation,
  Globe,
  Clock3,
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Compass,
  Building,
  Share2,
  Eye,
  Check,
  Wand2,
  CheckCheck,
} from 'lucide-react';
import { adminText, type Language } from './admin-dashboard-shell';
import {
  useAdminContact,
  useUpdateContact,
  useResetContact,
  formatCoordinates,
  buildGoogleMapsUrl,
  type ContactDetails,
  defaultContactDetails,
} from '@/lib/site-contact';

export function AdminContactPage({ language }: { language: Language }) {
  const isAr = language === 'ar';
  const queryClient = useQueryClient();
  const { data: contactData, isLoading, refetch } = useAdminContact();
  const updateMutation = useUpdateContact();
  const resetMutation = useResetContact();

  const [formData, setFormData] = useState<ContactDetails>(defaultContactDetails);
  const [latitudeInput, setLatitudeInput] = useState<string>(String(defaultContactDetails.latitude));
  const [longitudeInput, setLongitudeInput] = useState<string>(String(defaultContactDetails.longitude));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'channels' | 'location' | 'social' | 'preview'>('channels');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync form data when remote data arrives
  useEffect(() => {
    if (contactData) {
      setFormData(contactData);
      setLatitudeInput(String(contactData.latitude ?? 36.5868));
      setLongitudeInput(String(contactData.longitude ?? 37.0463));
      setIsDirty(false);
    }
  }, [contactData]);

  // Compute validation errors across all fields
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};

    // 1. Latitude validation (-90 to +90)
    const latTrimmed = latitudeInput.trim();
    if (!latTrimmed) {
      errs.latitude = adminText(language, 'خط العرض مطلوب', 'Latitude is required');
    } else {
      const latNum = parseFloat(latTrimmed);
      if (isNaN(latNum)) {
        errs.latitude = adminText(language, 'يجب إدخال قيمة رقمية صحيحة لخط العرض', 'Latitude must be a valid number');
      } else if (latNum < -90 || latNum > 90) {
        errs.latitude = adminText(
          language,
          'خط العرض يجب أن يكون رقماً بين -90 و +90 درجة (شمال/جنوب)',
          'Latitude must be a number between -90 and +90 degrees'
        );
      }
    }

    // 2. Longitude validation (-180 to +180)
    const lngTrimmed = longitudeInput.trim();
    if (!lngTrimmed) {
      errs.longitude = adminText(language, 'خط الطول مطلوب', 'Longitude is required');
    } else {
      const lngNum = parseFloat(lngTrimmed);
      if (isNaN(lngNum)) {
        errs.longitude = adminText(language, 'يجب إدخال قيمة رقمية صحيحة لخط الطول', 'Longitude must be a valid number');
      } else if (lngNum < -180 || lngNum > 180) {
        errs.longitude = adminText(
          language,
          'خط الطول يجب أن يكون رقماً بين -180 و +180 درجة (شرق/غرب)',
          'Longitude must be a number between -180 and +180 degrees'
        );
      }
    }

    // 3. Display phone number
    const phoneVal = (formData.phone || '').trim();
    const phoneDigits = phoneVal.replace(/\D/g, '');
    if (!phoneVal) {
      errs.phone = adminText(language, 'رقم الهاتف المعروض مطلوب', 'Display phone number is required');
    } else if (/[a-zA-Z\u0600-\u06FF]/.test(phoneVal) || /[^\d+\s-]/.test(phoneVal)) {
      errs.phone = adminText(
        language,
        'رقم الهاتف يجب أن يحتوي على أرقام فقط بدون أحرف أو نصوص',
        'Phone number must contain only numbers, no letters'
      );
    } else if (phoneDigits.length < 7 || phoneDigits.length > 16) {
      errs.phone = adminText(
        language,
        'رقم الهاتف المعروض يجب أن يحتوي على 7 إلى 16 رقماً صالحاً',
        'Display phone must contain 7 to 16 valid digits'
      );
    }

    // 4. Phone Raw (International Dial String)
    const phoneRawVal = (formData.phoneRaw || '').trim();
    if (!phoneRawVal) {
      errs.phoneRaw = adminText(language, 'رقم الاتصال الدولي (tel:) مطلوب', 'International dial string is required');
    } else if (/[a-zA-Z\u0600-\u06FF]/.test(phoneRawVal) || /[^\d+]/.test(phoneRawVal)) {
      errs.phoneRaw = adminText(
        language,
        'رقم الاتصال الدولي يجب أن يحتوي على أرقام فقط بدون أي أحرف',
        'International dial string must contain only numbers, no letters'
      );
    } else if (!/^\+?[1-9]\d{6,14}$/.test(phoneRawVal)) {
      errs.phoneRaw = adminText(
        language,
        'رقم الاتصال الدولي يجب أن يبدأ بـ + أو رمز الدولة متبوعاً بـ 7 إلى 15 رقماً (مثال: +963953316416)',
        'International dial string must start with + or country code with 7 to 15 digits (e.g. +963953316416)'
      );
    }

    // 5. Display WhatsApp number
    const waVal = (formData.whatsapp || '').trim();
    const waDigits = waVal.replace(/\D/g, '');
    if (!waVal) {
      errs.whatsapp = adminText(language, 'رقم واتساب المعروض مطلوب', 'Display WhatsApp number is required');
    } else if (/[a-zA-Z\u0600-\u06FF]/.test(waVal) || /[^\d+\s-]/.test(waVal)) {
      errs.whatsapp = adminText(
        language,
        'رقم واتساب يجب أن يحتوي على أرقام فقط بدون أحرف أو نصوص',
        'WhatsApp number must contain only numbers, no letters'
      );
    } else if (waDigits.length < 7 || waDigits.length > 16) {
      errs.whatsapp = adminText(
        language,
        'رقم واتساب يجب أن يحتوي على 7 إلى 16 رقماً صالحاً',
        'WhatsApp number must contain 7 to 16 valid digits'
      );
    }

    // 6. WhatsApp Raw (wa.me digits)
    const waRawVal = (formData.whatsappRaw || '').trim();
    if (!waRawVal) {
      errs.whatsappRaw = adminText(language, 'أرقام واتساب المباشرة لرابط wa.me مطلوبة', 'WhatsApp direct digits are required');
    } else if (/[^0-9]/.test(waRawVal)) {
      errs.whatsappRaw = adminText(
        language,
        'أرقام واتساب المباشرة يجب أن تكون أرقاماً فقط بدون أي أحرف أو رموز',
        'WhatsApp direct digits must contain only numbers, no letters or symbols'
      );
    } else if (!/^[1-9]\d{7,14}$/.test(waRawVal)) {
      errs.whatsappRaw = adminText(
        language,
        'أرقام واتساب لرابط wa.me يجب أن تكون أرقاماً فقط متضمنة رمز الدولة (8-15 رقماً) بدون + أو أصفار بادئة (مثال: 963953316416)',
        'WhatsApp wa.me digits must be numbers only with country code (8-15 digits) without + or leading zeros (e.g. 963953316416)'
      );
    }

    // 7. Primary Email
    const emailVal = (formData.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      errs.email = adminText(language, 'البريد الإلكتروني الأساسي مطلوب', 'Primary email address is required');
    } else if (!emailRegex.test(emailVal)) {
      errs.email = adminText(
        language,
        'صيغة البريد الإلكتروني غير صالحة (مثال: name@domain.com)',
        'Invalid email address format (e.g. name@domain.com)'
      );
    }

    // 8. Secondary Email (optional)
    const secEmailVal = (formData.secondaryEmail || '').trim();
    if (secEmailVal && !emailRegex.test(secEmailVal)) {
      errs.secondaryEmail = adminText(
        language,
        'صيغة البريد الإلكتروني الثانوي غير صالحة',
        'Invalid secondary email format'
      );
    }

    // 9. Maps URL (optional, but if present must be http/https)
    const mapsUrlVal = (formData.mapsUrl || '').trim();
    if (mapsUrlVal && !/^https?:\/\//i.test(mapsUrlVal)) {
      errs.mapsUrl = adminText(language, 'رابط خرائط جوجل يجب أن يبدأ بـ https://', 'Maps URL must start with https://');
    }

    // 10. Social URLs
    if (formData.socialLinkedin?.trim() && !/^https?:\/\//i.test(formData.socialLinkedin.trim())) {
      errs.socialLinkedin = adminText(language, 'رابط LinkedIn يجب أن يبدأ بـ https://', 'LinkedIn URL must start with https://');
    }
    if (formData.socialTwitter?.trim() && !/^https?:\/\//i.test(formData.socialTwitter.trim())) {
      errs.socialTwitter = adminText(language, 'رابط X / Twitter يجب أن يبدأ بـ https://', 'X / Twitter URL must start with https://');
    }
    if (formData.socialTelegram?.trim() && !/^https?:\/\//i.test(formData.socialTelegram.trim())) {
      errs.socialTelegram = adminText(language, 'الرابط يجب أن يبدأ بـ https://', 'URL must start with https://');
    }

    return errs;
  }, [formData, latitudeInput, longitudeInput, language]);

  const channelErrorsCount = [
    errors.phone,
    errors.phoneRaw,
    errors.whatsapp,
    errors.whatsappRaw,
    errors.email,
    errors.secondaryEmail,
  ].filter(Boolean).length;

  const locationErrorsCount = [
    errors.latitude,
    errors.longitude,
    errors.mapsUrl,
  ].filter(Boolean).length;

  const socialErrorsCount = [
    errors.socialLinkedin,
    errors.socialTwitter,
    errors.socialTelegram,
  ].filter(Boolean).length;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const handleChange = <K extends keyof ContactDetails>(field: K, value: ContactDetails[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      return next;
    });
    setIsDirty(true);
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleLatitudeChange = (val: string) => {
    setLatitudeInput(val);
    setIsDirty(true);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= -90 && num <= 90) {
      const formatted = formatCoordinates(num, formData.longitude);
      const autoMapUrl = buildGoogleMapsUrl(num, formData.longitude, formData.fullAddressEn || formData.locationTitleEn);
      setFormData((prev) => ({
        ...prev,
        latitude: num,
        coordinatesDisplay: formatted,
        mapsUrl: autoMapUrl,
      }));
    }
  };

  const handleLongitudeChange = (val: string) => {
    setLongitudeInput(val);
    setIsDirty(true);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= -180 && num <= 180) {
      const formatted = formatCoordinates(formData.latitude, num);
      const autoMapUrl = buildGoogleMapsUrl(formData.latitude, num, formData.fullAddressEn || formData.locationTitleEn);
      setFormData((prev) => ({
        ...prev,
        longitude: num,
        coordinatesDisplay: formatted,
        mapsUrl: autoMapUrl,
      }));
    }
  };

  const applyCoordinatePreset = (
    lat: number,
    lng: number,
    titleAr?: string,
    titleEn?: string,
    subAr?: string,
    subEn?: string
  ) => {
    setLatitudeInput(String(lat));
    setLongitudeInput(String(lng));
    const formatted = formatCoordinates(lat, lng);
    const autoMapUrl = buildGoogleMapsUrl(lat, lng, subEn || titleEn);
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      coordinatesDisplay: formatted,
      mapsUrl: autoMapUrl,
      ...(titleAr ? { locationTitleAr: titleAr } : {}),
      ...(titleEn ? { locationTitleEn: titleEn } : {}),
      ...(subAr ? { locationSubtitleAr: subAr } : {}),
      ...(subEn ? { locationSubtitleEn: subEn } : {}),
    }));
    setIsDirty(true);
    setTouched((prev) => ({ ...prev, latitude: true, longitude: true }));
  };

  // Helper: auto-derive phoneRaw from display phone
  const handleAutoDerivePhoneRaw = () => {
    const digits = (formData.phone || '').replace(/\D/g, '');
    if (digits) {
      const formatted = '+' + digits;
      handleChange('phoneRaw', formatted);
      markTouched('phoneRaw');
    }
  };

  // Helper: auto-extract pure digits for wa.me link
  const handleAutoCleanWhatsappRaw = () => {
    let digits = (formData.whatsapp || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length === 10) {
      // Local Syrian/Gulf mobile (e.g. 0953316416 -> 963953316416)
      digits = '963' + digits.slice(1);
    }
    if (digits) {
      handleChange('whatsappRaw', digits);
      markTouched('whatsappRaw');
    }
  };

  // Helper: regenerate Google Maps URL from current lat/lng
  const handleRegenerateMapsUrl = () => {
    const latNum = parseFloat(latitudeInput);
    const lngNum = parseFloat(longitudeInput);
    const validLat = !isNaN(latNum) && latNum >= -90 && latNum <= 90 ? latNum : formData.latitude;
    const validLng = !isNaN(lngNum) && lngNum >= -180 && lngNum <= 180 ? lngNum : formData.longitude;
    const autoMapUrl = buildGoogleMapsUrl(validLat, validLng, formData.fullAddressEn || formData.locationTitleEn);
    handleChange('mapsUrl', autoMapUrl);
    markTouched('mapsUrl');
  };

  const handleSave = async () => {
    // Touch all fields to reveal errors
    setTouched({
      phone: true,
      phoneRaw: true,
      whatsapp: true,
      whatsappRaw: true,
      email: true,
      secondaryEmail: true,
      latitude: true,
      longitude: true,
      mapsUrl: true,
      socialLinkedin: true,
      socialTwitter: true,
      socialTelegram: true,
    });

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      // Switch to the relevant tab
      if (channelErrorsCount > 0) {
        setActiveTab('channels');
      } else if (locationErrorsCount > 0) {
        setActiveTab('location');
      } else if (socialErrorsCount > 0) {
        setActiveTab('social');
      }

      showFeedback(
        'error',
        isAr
          ? 'يرجى تصحيح الحقول غير الصالحة الموضحة باللون الأحمر قبل الحفظ.'
          : 'Please correct the invalid fields highlighted in red before saving.'
      );
      return;
    }

    try {
      const latNum = parseFloat(latitudeInput);
      const lngNum = parseFloat(longitudeInput);
      const payload: ContactDetails = {
        ...formData,
        latitude: !isNaN(latNum) ? latNum : formData.latitude,
        longitude: !isNaN(lngNum) ? lngNum : formData.longitude,
      };

      await updateMutation.mutateAsync(payload);
      setIsDirty(false);
      showFeedback(
        'success',
        isAr
          ? 'تم حفظ وتحديث بيانات التواصل والإحداثيات بنجاح وستظهر في كافة أقسام الموقع!'
          : 'Contact details and coordinates updated successfully across all pages!'
      );
    } catch (err: any) {
      showFeedback(
        'error',
        isAr
          ? `فشل في حفظ التعديلات: ${err?.message || 'خطأ غير معروف'}`
          : `Failed to save changes: ${err?.message || 'Unknown error'}`
      );
    }
  };

  const handleResetToDefaults = async () => {
    try {
      const reset = await resetMutation.mutateAsync();
      setFormData(reset);
      setLatitudeInput(String(reset.latitude));
      setLongitudeInput(String(reset.longitude));
      setTouched({});
      setIsDirty(false);
      setIsResetConfirmOpen(false);
      showFeedback(
        'success',
        isAr
          ? 'تمت استعادة بيانات التواصل الافتراضية بنجاح!'
          : 'Contact details reset to system defaults successfully!'
      );
    } catch (err: any) {
      showFeedback(
        'error',
        isAr
          ? `فشل في استعادة الافتراضي: ${err?.message || 'خطأ غير متوقع'}`
          : `Failed to reset: ${err?.message || 'Unexpected error'}`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="font-code text-sm tracking-wider">
          {adminText(language, 'جاري تحميل بيانات التواصل...', 'Loading contact details...')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Header Card */}
      <div className="border border-border/80 bg-card/60 p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 font-code text-xs font-semibold uppercase tracking-[.2em] text-primary">
              <Compass className="size-4" />
              <span>{adminText(language, 'إدارة الهوية والتواصل / 07', 'IDENTITY & COORDINATES / 07')}</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              {adminText(language, 'إدارة بيانات التواصل والإحداثيات', 'Contact Details & Coordinates')}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {adminText(
                language,
                'تحديث أرقام الاتصال المباشر، رابط الواتساب، البريد الرسمي، الموقع الجغرافي والإحداثيات التي تنعكس تلقائياً في التذييل وقسم التواصل وصفحة الاتصال.',
                'Manage direct phone lines, WhatsApp link, email, geographic coordinates, and location displayed in the footer, contact section, and contact page.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-code text-xs text-amber-400">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                {adminText(language, 'تعديلات غير محفوظة', 'Unsaved changes')}
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={resetMutation.isPending}
              className="inline-flex items-center gap-2 border border-border bg-secondary/60 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              data-testid="button-reset-contact-defaults"
            >
              <RotateCcw className="size-3.5" />
              {adminText(language, 'استعادة الافتراضي', 'Reset Defaults')}
            </button>

            <a
              href="/contact"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-border bg-secondary/60 px-4 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
              data-testid="link-view-contact-public"
            >
              <ExternalLink className="size-3.5" />
              {adminText(language, 'معاينة الصفحة العامة', 'View Public Page')}
            </a>

            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 border border-primary/50 bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              data-testid="button-save-contact-details"
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {adminText(language, 'حفظ التعديلات', 'Save Changes')}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-6 flex items-center justify-between border px-4 py-3 text-sm transition-all ${
              feedback.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-code text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-border/80 pb-px">
          {[
            {
              id: 'channels' as const,
              labelAr: 'قنوات التواصل المباشرة',
              labelEn: 'Direct Channels',
              icon: Phone,
              errorsCount: channelErrorsCount,
            },
            {
              id: 'location' as const,
              labelAr: 'الموقع والإحداثيات الجغرافية',
              labelEn: 'Location & Coordinates',
              icon: MapPin,
              errorsCount: locationErrorsCount,
            },
            {
              id: 'social' as const,
              labelAr: 'ساعات العمل والشبكات',
              labelEn: 'Hours & Social',
              icon: Clock3,
              errorsCount: socialErrorsCount,
            },
            {
              id: 'preview' as const,
              labelAr: 'المعاينة الحية الفورية',
              labelEn: 'Live Previews',
              icon: Eye,
              errorsCount: 0,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
                data-testid={`tab-contact-${tab.id}`}
              >
                <Icon className="size-3.5" />
                <span>{adminText(language, tab.labelAr, tab.labelEn)}</span>
                {tab.errorsCount > 0 && (
                  <span
                    className="rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-1.5 py-0.2 text-[10px] font-code font-bold leading-tight"
                    title={adminText(language, `${tab.errorsCount} أخطاء في هذا القسم`, `${tab.errorsCount} validation errors in this section`)}
                  >
                    {tab.errorsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'channels' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card: Phone & Direct Line */}
          <div className="border border-border bg-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <span className="grid size-9 place-items-center border border-primary/40 bg-primary/10 text-primary">
                <Phone className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {adminText(language, 'الهاتف وخط الاتصال المباشر', 'Phone & Direct Line')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {adminText(language, 'يستخدم في روابط tel: والاتصال الفوري للمراجعين', 'Used for click-to-call direct dial links')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Display Phone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    {adminText(language, 'رقم الهاتف المعروض للمستخدم', 'Display Phone Number')}
                  </label>
                  <span className="font-code text-[10px] text-muted-foreground">
                    {adminText(language, 'أرقام فقط (7-16 رقماً)', 'Numbers only (7-16 digits)')}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9+ ]/g, '').replace(/(?!^)\+/g, '');
                    handleChange('phone', cleaned);
                    markTouched('phone');
                  }}
                  onBlur={() => markTouched('phone')}
                  placeholder="095 331 6416"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.phone && errors.phone
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-contact-phone"
                />
                {touched.phone && errors.phone ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.phone}</span>
                  </p>
                ) : (
                  <p className="mt-1 font-code text-[11px] text-muted-foreground">
                    {adminText(language, 'أرقام فقط بدون أحرف (مثال: 095 331 6416 أو +963953316416)', 'Numbers only, no letters (e.g. 095 331 6416 or +963953316416)')}
                  </p>
                )}
              </div>

              {/* International Phone Raw */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    {adminText(language, 'رقم الاتصال الدولي (tel: format)', 'International Dial String')}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-code text-[10px] text-muted-foreground">
                      {adminText(language, 'أرقام فقط', 'Numbers only')}
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoDerivePhoneRaw}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      title={adminText(language, 'توليد من رقم الهاتف المعروض أعلاه', 'Auto-format from display phone')}
                    >
                      <Wand2 className="size-3" />
                      <span>{adminText(language, 'توليد تلقائي', 'Auto-derive')}</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="tel"
                  value={formData.phoneRaw}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
                    handleChange('phoneRaw', cleaned);
                    markTouched('phoneRaw');
                  }}
                  onBlur={() => markTouched('phoneRaw')}
                  placeholder="+963953316416"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.phoneRaw && errors.phoneRaw
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-contact-phone-raw"
                />
                {touched.phoneRaw && errors.phoneRaw ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.phoneRaw}</span>
                  </p>
                ) : (
                  <div className="mt-1.5 flex items-center gap-2 font-code text-[11px] text-muted-foreground">
                    <span className="text-emerald-500">✓ tel:{formData.phoneRaw || '+963953316416'}</span>
                    <span>•</span>
                    <span>{adminText(language, 'أرقام فقط مع رمز الدولة (+ اختياري بدون أحرف)', 'Numbers only with country code (+ optional, no letters)')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: WhatsApp */}
          <div className="border border-border bg-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <span className="grid size-9 place-items-center border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                <MessageCircle className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {adminText(language, 'واتساب للتواصل الفوري', 'WhatsApp Business / Direct')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {adminText(language, 'يفتح محادثة واتساب مشفرة مباشرة مع المهندس', 'Generates wa.me instant chat links')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Display WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    {adminText(language, 'رقم واتساب المعروض', 'Display WhatsApp Number')}
                  </label>
                  <span className="font-code text-[10px] text-muted-foreground">
                    {adminText(language, 'أرقام فقط (7-16 رقماً)', 'Numbers only (7-16 digits)')}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="tel"
                  value={formData.whatsapp}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9+ ]/g, '').replace(/(?!^)\+/g, '');
                    handleChange('whatsapp', cleaned);
                    markTouched('whatsapp');
                  }}
                  onBlur={() => markTouched('whatsapp')}
                  placeholder="095 331 6416"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.whatsapp && errors.whatsapp
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-contact-whatsapp"
                />
                {touched.whatsapp && errors.whatsapp ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.whatsapp}</span>
                  </p>
                ) : (
                  <p className="mt-1 font-code text-[11px] text-muted-foreground">
                    {adminText(language, 'أرقام فقط بدون أحرف (مثال: 095 331 6416 أو 963953316416)', 'Numbers only, no letters (e.g. 095 331 6416 or 963953316416)')}
                  </p>
                )}
              </div>

              {/* WhatsApp Raw (wa.me) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    {adminText(language, 'أرقام واتساب لرابط wa.me (أرقام نقية مع الرمز)', 'WhatsApp Direct Digits (wa.me)')}
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCleanWhatsappRaw}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
                    title={adminText(language, 'استخراج الأرقام فقط من رقم واتساب المعروض', 'Extract clean digits from WhatsApp')}
                  >
                    <Wand2 className="size-3" />
                    <span>{adminText(language, 'استخراج الأرقام', 'Clean digits')}</span>
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.whatsappRaw}
                  onChange={(e) => {
                    handleChange('whatsappRaw', e.target.value.replace(/[^0-9]/g, ''));
                    markTouched('whatsappRaw');
                  }}
                  onBlur={() => markTouched('whatsappRaw')}
                  placeholder="963953316416"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.whatsappRaw && errors.whatsappRaw
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-contact-whatsapp-raw"
                />
                {touched.whatsappRaw && errors.whatsappRaw ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.whatsappRaw}</span>
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-2 rounded bg-background/40 p-2 font-code text-xs text-emerald-400 border border-emerald-500/20">
                    <span className="text-muted-foreground">URL:</span>
                    <span className="truncate">https://wa.me/{formData.whatsappRaw || '963953316416'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Email addresses */}
          <div className="border border-border bg-card p-6 sm:p-7 space-y-6 lg:col-span-2">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <span className="grid size-9 place-items-center border border-primary/40 bg-primary/10 text-primary">
                <Mail className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {adminText(language, 'عناوين البريد الإلكتروني الرسمية', 'Official Email Addresses')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {adminText(language, 'المستخدمة في التذييل وصفحات الموقع وتلقي المراسلات الهندسية', 'Displayed in footers and mailto links')}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Primary Email */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {adminText(language, 'البريد الإلكتروني الأساسي', 'Primary Email')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    handleChange('email', e.target.value.trim());
                    markTouched('email');
                  }}
                  onBlur={() => markTouched('email')}
                  placeholder="amj.tech.work@gmail.com"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.email && errors.email
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-contact-primary-email"
                />
                {touched.email && errors.email && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Secondary Email */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {adminText(language, 'بريد إلكتروني بديل أو إضافي (اختياري)', 'Secondary / Support Email (Optional)')}
                </label>
                <input
                  type="email"
                  value={formData.secondaryEmail || ''}
                  onChange={(e) => {
                    handleChange('secondaryEmail', e.target.value.trim());
                    markTouched('secondaryEmail');
                  }}
                  onBlur={() => markTouched('secondaryEmail')}
                  placeholder="hello@aj-industry.com"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.secondaryEmail && errors.secondaryEmail
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-contact-secondary-email"
                />
                {touched.secondaryEmail && errors.secondaryEmail && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.secondaryEmail}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Location & Coordinates */}
      {activeTab === 'location' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {/* Inputs */}
          <div className="border border-border bg-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <span className="grid size-9 place-items-center border border-primary/40 bg-primary/10 text-primary">
                <Compass className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {adminText(language, 'الإحداثيات الدقيقة والموقع الجغرافي', 'Geographic Coordinates & Location')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {adminText(language, 'تحديد خط العرض والطول لعرضها على خريطة الرادار ورابط خرائط جوجل', 'Set latitude and longitude for the radar map & Google Maps link')}
                </p>
              </div>
            </div>

            {/* Coordinates Lat / Lng */}
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Latitude */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      {adminText(language, 'خط العرض (Latitude N/S)', 'Latitude')}
                    </label>
                    <span className="font-code text-[10px] text-muted-foreground">
                      -90.0000° ~ +90.0000°
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitudeInput}
                    onChange={(e) => handleLatitudeChange(e.target.value)}
                    onBlur={() => markTouched('latitude')}
                    placeholder="36.5868"
                    className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                      touched.latitude && errors.latitude
                        ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                        : 'border-input bg-background/60 focus:border-primary'
                    }`}
                    data-testid="input-contact-latitude"
                  />
                  {touched.latitude && errors.latitude ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{errors.latitude}</span>
                    </p>
                  ) : (
                    <p className="mt-1 font-code text-[11px] text-muted-foreground">
                      {adminText(language, 'القيمة الإيجابية للشمال (+) والسلبية للجنوب (-)', 'Positive for North (+), negative for South (-)')}
                    </p>
                  )}
                </div>

                {/* Longitude */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      {adminText(language, 'خط الطول (Longitude E/W)', 'Longitude')}
                    </label>
                    <span className="font-code text-[10px] text-muted-foreground">
                      -180.0000° ~ +180.0000°
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitudeInput}
                    onChange={(e) => handleLongitudeChange(e.target.value)}
                    onBlur={() => markTouched('longitude')}
                    placeholder="37.0463"
                    className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                      touched.longitude && errors.longitude
                        ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                        : 'border-input bg-background/60 focus:border-primary'
                    }`}
                    data-testid="input-contact-longitude"
                  />
                  {touched.longitude && errors.longitude ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{errors.longitude}</span>
                    </p>
                  ) : (
                    <p className="mt-1 font-code text-[11px] text-muted-foreground">
                      {adminText(language, 'القيمة الإيجابية للشرق (+) والسلبية للغرب (-)', 'Positive for East (+), negative for West (-)')}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Industrial Location Presets */}
              <div className="rounded border border-border/80 bg-background/40 p-3 space-y-2">
                <span className="block font-code text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {adminText(language, 'مواقع صناعية سريعة مسبقة الضبط (نقرة واحدة للتعيين)', 'Quick Industrial Presets (One-click apply)')}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      applyCoordinatePreset(
                        36.5868,
                        37.0463,
                        'حلب / سوريا',
                        'Aleppo / Syria',
                        'المنطقة الصناعية في اعزاز',
                        'AZAZ / INDUSTRIAL ZONE'
                      )
                    }
                    className="inline-flex items-center gap-1 border border-border/80 bg-secondary/60 px-2.5 py-1 font-code text-[11px] text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    📍 {adminText(language, 'اعزاز الصناعية (حلب)', 'Azaz Industrial (Aleppo)')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyCoordinatePreset(
                        24.6341,
                        46.8122,
                        'الرياض / السعودية',
                        'Riyadh / Saudi Arabia',
                        'المدينة الصناعية الثانية',
                        '2nd Industrial City'
                      )
                    }
                    className="inline-flex items-center gap-1 border border-border/80 bg-secondary/60 px-2.5 py-1 font-code text-[11px] text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    📍 {adminText(language, 'صناعية الرياض الثانية', 'Riyadh 2nd Industrial')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyCoordinatePreset(
                        33.5833,
                        36.5167,
                        'دمشق / سوريا',
                        'Damascus / Syria',
                        'مدينة عدرا الصناعية',
                        'Adra Industrial City'
                      )
                    }
                    className="inline-flex items-center gap-1 border border-border/80 bg-secondary/60 px-2.5 py-1 font-code text-[11px] text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    📍 {adminText(language, 'عدرا الصناعية (دمشق)', 'Adra Industrial (Damascus)')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyCoordinatePreset(
                        25.1333,
                        55.2333,
                        'دبي / الإمارات',
                        'Dubai / UAE',
                        'منطقة القوز الصناعية',
                        'Al Quoz Industrial Area'
                      )
                    }
                    className="inline-flex items-center gap-1 border border-border/80 bg-secondary/60 px-2.5 py-1 font-code text-[11px] text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    📍 {adminText(language, 'القوز الصناعية (دبي)', 'Al Quoz Industrial (Dubai)')}
                  </button>
                </div>
              </div>
            </div>

            {/* Formatted Coordinates Display */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                {adminText(language, 'صيغة الإحداثيات المعروضة', 'Coordinates Display Format')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.coordinatesDisplay}
                  onChange={(e) => handleChange('coordinatesDisplay', e.target.value)}
                  placeholder="36.5868° N, 37.0463° E"
                  className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm font-code outline-none focus:border-primary"
                  data-testid="input-contact-coordinates-display"
                />
                <button
                  type="button"
                  onClick={() => {
                    const latVal = parseFloat(latitudeInput) || formData.latitude;
                    const lngVal = parseFloat(longitudeInput) || formData.longitude;
                    const formatted = formatCoordinates(latVal, lngVal);
                    handleChange('coordinatesDisplay', formatted);
                  }}
                  className="shrink-0 border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary"
                  title={adminText(language, 'إعادة توليد الصيغة تلقائياً', 'Auto-format')}
                >
                  {adminText(language, 'توليد تلقائي', 'Auto')}
                </button>
              </div>
            </div>

            {/* Google Maps Link */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  {adminText(language, 'رابط خرائط جوجل (Google Maps URL)', 'Google Maps Link')}
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateMapsUrl}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  title={adminText(language, 'توليد رابط الخريطة تلقائياً من الإحداثيات الحالية', 'Auto-generate Maps URL from coordinates')}
                >
                  <Wand2 className="size-3" />
                  <span>{adminText(language, 'توليد من الإحداثيات', 'Generate from coords')}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.mapsUrl}
                  onChange={(e) => {
                    handleChange('mapsUrl', e.target.value.trim());
                    markTouched('mapsUrl');
                  }}
                  onBlur={() => markTouched('mapsUrl')}
                  placeholder="https://www.google.com/maps/search/?api=1&query=36.5868,37.0463"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.mapsUrl && errors.mapsUrl
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-contact-maps-url"
                />
                {formData.mapsUrl && (
                  <a
                    href={formData.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 border border-border bg-secondary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
                    title={adminText(language, 'فتح وتجربة الرابط في لسان جديد', 'Test link')}
                  >
                    <Navigation className="size-3.5" />
                    <span>{adminText(language, 'تجربة', 'Test')}</span>
                  </a>
                )}
              </div>
              {touched.mapsUrl && errors.mapsUrl && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{errors.mapsUrl}</span>
                </p>
              )}
            </div>

            <div className="border-t border-border/70 pt-4 space-y-4">
              <h3 className="font-display text-sm font-bold text-foreground">
                {adminText(language, 'عناوين الموقع والنصوص الوصفية', 'Location Names & Labels')}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {adminText(language, 'اسم المدينة / الدولة (عربي)', 'City / Country (Arabic)')}
                  </label>
                  <input
                    type="text"
                    value={formData.locationTitleAr}
                    onChange={(e) => handleChange('locationTitleAr', e.target.value)}
                    placeholder="حلب / سوريا"
                    className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    data-testid="input-location-title-ar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {adminText(language, 'اسم المدينة / الدولة (إنجليزي)', 'City / Country (English)')}
                  </label>
                  <input
                    type="text"
                    value={formData.locationTitleEn}
                    onChange={(e) => handleChange('locationTitleEn', e.target.value)}
                    placeholder="Aleppo / Syria"
                    className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    data-testid="input-location-title-en"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {adminText(language, 'المنطقة / الشارع (عربي)', 'Area / Industrial Zone (Arabic)')}
                  </label>
                  <input
                    type="text"
                    value={formData.locationSubtitleAr}
                    onChange={(e) => handleChange('locationSubtitleAr', e.target.value)}
                    placeholder="المنطقة الصناعية في اعزاز"
                    className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    data-testid="input-location-subtitle-ar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {adminText(language, 'المنطقة / الشارع (إنجليزي)', 'Area / Industrial Zone (English)')}
                  </label>
                  <input
                    type="text"
                    value={formData.locationSubtitleEn}
                    onChange={(e) => handleChange('locationSubtitleEn', e.target.value)}
                    placeholder="AZAZ / INDUSTRIAL ZONE"
                    className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    data-testid="input-location-subtitle-en"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {adminText(language, 'العنوان الكامل للتذييل (عربي)', 'Full Address for Footer (Arabic)')}
                </label>
                <input
                  type="text"
                  value={formData.fullAddressAr}
                  onChange={(e) => handleChange('fullAddressAr', e.target.value)}
                  placeholder="المنطقة الصناعية، اعزاز، حلب، سوريا"
                  className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  data-testid="input-full-address-ar"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {adminText(language, 'العنوان الكامل للتذييل (إنجليزي)', 'Full Address for Footer (English)')}
                </label>
                <input
                  type="text"
                  value={formData.fullAddressEn}
                  onChange={(e) => handleChange('fullAddressEn', e.target.value)}
                  placeholder="Azaz Industrial Zone, Aleppo, Syria"
                  className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  data-testid="input-full-address-en"
                />
              </div>
            </div>
          </div>

          {/* Live Radar / Blueprint Map Preview Box */}
          <div className="space-y-4">
            <div className="border border-border/80 bg-card/60 p-4">
              <span className="font-code text-[11px] font-semibold uppercase tracking-[.18em] text-primary">
                {adminText(language, 'معاينة خريطة الرادار الهندسية', 'Engineering Radar Map Preview')}
              </span>
            </div>

            <div className="relative overflow-hidden border border-border bg-[#0a1a2b] shadow-2xl">
              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(hsl(211_100%_61%/.16)_1px,transparent_1px),linear-gradient(90deg,hsl(211_100%_61%/.16)_1px,transparent_1px)] [background-size:38px_38px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,hsl(211_100%_61%/.22),transparent_32%)]" />
              <div className="absolute left-[6%] top-[25%] h-px w-[92%] rotate-[13deg] bg-primary/25" />
              <div className="absolute left-[10%] top-[68%] h-1 w-[85%] rotate-[-20deg] bg-primary/20" />
              <div className="absolute left-[22%] top-[6%] h-[94%] w-px rotate-[27deg] bg-primary/20" />
              <div className="absolute left-[61%] top-[3%] h-[92%] w-px rotate-[-38deg] bg-primary/20" />

              <div className="relative min-h-[310px] p-5 sm:min-h-[360px] sm:p-7">
                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                  <div className="flex items-center gap-2 font-code text-[10px] tracking-[.15em] text-primary">
                    <MapPin className="size-3.5" /> LOCATION / 02
                  </div>
                  <span className="font-code text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE COORDINATES
                  </span>
                </div>

                <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
                  <span className="absolute size-20 animate-pulse rounded-full border border-primary/30" />
                  <span className="absolute size-11 rounded-full border border-primary/50 bg-primary/10" />
                  <span className="relative grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_35px_hsl(211_100%_61%/.65)]">
                    <MapPin className="size-4 fill-current" />
                  </span>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7">
                  <div className="bg-[#071126]/85 p-4 backdrop-blur-sm border border-primary/20">
                    <p className="font-display text-sm font-bold text-foreground">
                      {isAr ? formData.locationTitleAr : formData.locationTitleEn}
                    </p>
                    <p className="mt-1 font-code text-[10px] text-primary">
                      {isAr ? formData.locationSubtitleAr : formData.locationSubtitleEn}
                    </p>
                  </div>

                  <div className="text-right font-code text-[11px] leading-5 text-emerald-400 bg-[#071126]/85 p-3 border border-border/70 backdrop-blur-sm">
                    <p>{formData.latitude.toFixed(4)}° N</p>
                    <p>{formData.longitude.toFixed(4)}° E</p>
                  </div>
                </div>
              </div>

              <a
                href={formData.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="relative flex items-center justify-between border-t border-border/70 bg-[#071126]/85 px-5 py-4 text-xs font-semibold text-primary transition-colors hover:bg-[#071126]"
              >
                <span>{adminText(language, 'فتح الموقع على خرائط جوجل', 'Open location on Google Maps')}</span>
                <Navigation className="size-4 text-primary" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Working Hours & Social Links */}
      {activeTab === 'social' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Working Hours Card */}
          <div className="border border-border bg-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <span className="grid size-9 place-items-center border border-primary/40 bg-primary/10 text-primary">
                <Clock3 className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {adminText(language, 'ساعات العمل والاستجابة الهندسية', 'Operating & Response Hours')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {adminText(language, 'تظهر للمراجعين لتوضيح أوقات الدوام وسرعة الاستجابة', 'Displayed on the contact card for customer guidance')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {adminText(language, 'ساعات العمل (باللغة العربية)', 'Response Hours (Arabic)')}
                </label>
                <input
                  type="text"
                  value={formData.workingHoursAr}
                  onChange={(e) => handleChange('workingHoursAr', e.target.value)}
                  placeholder="الأحد — الخميس / 09:00 — 18:00"
                  className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  data-testid="input-working-hours-ar"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {adminText(language, 'ساعات العمل (باللغة الإنجليزية)', 'Response Hours (English)')}
                </label>
                <input
                  type="text"
                  value={formData.workingHoursEn}
                  onChange={(e) => handleChange('workingHoursEn', e.target.value)}
                  placeholder="Sunday — Thursday / 09:00 — 18:00"
                  className="w-full border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  data-testid="input-working-hours-en"
                />
              </div>
            </div>
          </div>

          {/* Social Links Card */}
          <div className="border border-border bg-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <span className="grid size-9 place-items-center border border-primary/40 bg-primary/10 text-primary">
                <Share2 className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {adminText(language, 'روابط المنصات وشبكات التواصل', 'Social & Professional Links')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {adminText(language, 'روابط الأيقونات في تذييل الموقع', 'Configures the social icons in the footer')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.socialLinkedin || ''}
                  onChange={(e) => {
                    handleChange('socialLinkedin', e.target.value.trim());
                    markTouched('socialLinkedin');
                  }}
                  onBlur={() => markTouched('socialLinkedin')}
                  placeholder="https://linkedin.com/company/aj-industry"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.socialLinkedin && errors.socialLinkedin
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-social-linkedin"
                />
                {touched.socialLinkedin && errors.socialLinkedin && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.socialLinkedin}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  X / Twitter URL
                </label>
                <input
                  type="url"
                  value={formData.socialTwitter || ''}
                  onChange={(e) => {
                    handleChange('socialTwitter', e.target.value.trim());
                    markTouched('socialTwitter');
                  }}
                  onBlur={() => markTouched('socialTwitter')}
                  placeholder="https://x.com/aj_industry"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.socialTwitter && errors.socialTwitter
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-social-twitter"
                />
                {touched.socialTwitter && errors.socialTwitter && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.socialTwitter}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Telegram / Instagram URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.socialTelegram || ''}
                  onChange={(e) => {
                    handleChange('socialTelegram', e.target.value.trim());
                    markTouched('socialTelegram');
                  }}
                  onBlur={() => markTouched('socialTelegram')}
                  placeholder="https://t.me/aj_industry"
                  className={`w-full border px-3.5 py-2.5 text-sm font-code outline-none transition-colors ${
                    touched.socialTelegram && errors.socialTelegram
                      ? 'border-destructive bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                      : 'border-input bg-background/60 focus:border-primary'
                  }`}
                  data-testid="input-social-telegram"
                />
                {touched.socialTelegram && errors.socialTelegram && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errors.socialTelegram}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Live Previews */}
      {activeTab === 'preview' && (
        <div className="space-y-8">
          {/* Footer Preview */}
          <div className="border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
              <span className="font-code text-xs font-semibold text-primary">
                PREVIEW 01 / FOOTER CONTACT BAR
              </span>
              <span className="font-code text-xs text-muted-foreground">AS SEEN ON ALL PUBLIC PAGES</span>
            </div>

            <div className="rounded-lg border border-border bg-[#071126] p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="font-code text-[10px] tracking-[.2em] text-primary">CONTACT</p>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground font-code">
                    <a href={`mailto:${formData.email}`} className="text-primary hover:underline">
                      {formData.email}
                    </a>
                    <a href={`tel:${formData.phoneRaw}`} className="hover:text-foreground">
                      {formData.phone}
                    </a>
                    <span>{isAr ? formData.fullAddressAr : formData.fullAddressEn}</span>
                  </div>
                </div>

                <div>
                  <p className="font-code text-[10px] tracking-[.2em] text-primary">LOCATION & COORDINATES</p>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground font-code">
                    <span className="text-foreground font-semibold">
                      {isAr ? formData.locationTitleAr : formData.locationTitleEn}
                    </span>
                    <span className="text-xs text-primary">
                      {isAr ? formData.locationSubtitleAr : formData.locationSubtitleEn}
                    </span>
                    <span className="text-xs text-emerald-400">
                      {formData.coordinatesDisplay}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-code text-[10px] tracking-[.2em] text-primary">HOURS & WHATSAPP</p>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    <span>{isAr ? formData.workingHoursAr : formData.workingHoursEn}</span>
                    <a
                      href={`https://wa.me/${formData.whatsappRaw}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>WhatsApp: {formData.whatsapp}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Page Channels Preview */}
          <div className="border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
              <span className="font-code text-xs font-semibold text-primary">
                PREVIEW 02 / CONTACT PAGE BUTTONS
              </span>
              <span className="font-code text-xs text-muted-foreground">AS SEEN ON /contact</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* WhatsApp Card */}
              <div className="flex items-center gap-4 border border-accent/35 bg-accent/10 p-4">
                <span className="grid size-10 shrink-0 place-items-center border border-accent/40 bg-background/30 text-accent">
                  <MessageCircle className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-code text-[10px] tracking-[.16em] text-muted-foreground">
                    {adminText(language, 'واتساب', 'WhatsApp')}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold">{formData.whatsapp}</span>
                </div>
              </div>

              {/* Phone Card */}
              <div className="flex items-center gap-4 border border-primary/35 bg-primary/10 p-4">
                <span className="grid size-10 shrink-0 place-items-center border border-primary/30 bg-background/30 text-primary">
                  <Phone className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-code text-[10px] tracking-[.16em] text-muted-foreground">
                    {adminText(language, 'اتصال مباشر', 'Direct line')}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold">{formData.phone}</span>
                </div>
              </div>

              {/* Email Card */}
              <div className="flex items-center gap-4 border border-primary/35 bg-primary/10 p-4">
                <span className="grid size-10 shrink-0 place-items-center border border-primary/30 bg-background/30 text-primary">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-code text-[10px] tracking-[.16em] text-muted-foreground">
                    {adminText(language, 'البريد الإلكتروني', 'Email')}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold">{formData.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md border border-border bg-card p-6 shadow-2xl space-y-4"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="size-6 shrink-0" />
              <h3 className="font-display text-lg font-bold text-foreground">
                {adminText(language, 'تأكيد استعادة الإعدادات الافتراضية', 'Reset to Defaults')}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {adminText(
                language,
                'هل أنت متأكد من استعادة كافة بيانات التواصل والموقع والإحداثيات الأصلية لشركة AJ—INDUSTRY؟ سيتم استبدال التعديلات الحالية فوراً.',
                'Are you sure you want to reset all contact channels, location details, and coordinates to the factory defaults? Any custom edits will be replaced.'
              )}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="border border-border bg-secondary/80 px-4 py-2 text-xs font-semibold hover:bg-secondary"
              >
                {adminText(language, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={resetMutation.isPending}
                className="inline-flex items-center gap-2 border border-destructive/60 bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {resetMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                {adminText(language, 'نعم، استعد الافتراضي', 'Yes, Reset Defaults')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminContactPage;
