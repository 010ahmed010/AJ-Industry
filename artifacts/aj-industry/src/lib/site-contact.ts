import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safeStorage } from './storage';

export interface ContactDetails {
  email: string;
  secondaryEmail?: string;
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  whatsappRaw: string;
  locationTitleAr: string;
  locationTitleEn: string;
  locationSubtitleAr: string;
  locationSubtitleEn: string;
  fullAddressAr: string;
  fullAddressEn: string;
  latitude: number;
  longitude: number;
  coordinatesDisplay: string;
  mapsUrl: string;
  workingHoursAr: string;
  workingHoursEn: string;
  socialLinkedin?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialTelegram?: string;
  updatedAt?: string;
}

export const defaultContactDetails: ContactDetails = {
  email: 'amj.tech.work@gmail.com',
  secondaryEmail: 'hello@aj-industry.com',
  phone: '095 331 6416',
  phoneRaw: '+963953316416',
  whatsapp: '095 331 6416',
  whatsappRaw: '963953316416',
  locationTitleAr: 'حلب / سوريا',
  locationTitleEn: 'Aleppo / Syria',
  locationSubtitleAr: 'المنطقة الصناعية في اعزاز',
  locationSubtitleEn: 'AZAZ / INDUSTRIAL ZONE',
  fullAddressAr: 'المنطقة الصناعية، اعزاز، حلب، سوريا',
  fullAddressEn: 'Azaz Industrial Zone, Aleppo, Syria',
  latitude: 36.5868,
  longitude: 37.0463,
  coordinatesDisplay: '36.5868° N, 37.0463° E',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Azaz%2C%20Aleppo%2C%20Syria',
  workingHoursAr: 'الأحد — الخميس / 09:00 — 18:00',
  workingHoursEn: 'Sunday — Thursday / 09:00 — 18:00',
  socialLinkedin: 'https://linkedin.com',
  socialTwitter: 'https://x.com',
  socialInstagram: '',
  socialTelegram: '',
  updatedAt: new Date().toISOString(),
};

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export function buildGoogleMapsUrl(lat: number, lng: number, fallbackLabel?: string): string {
  if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return fallbackLabel
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackLabel)}`
    : 'https://maps.google.com';
}

function getStoredContact(): ContactDetails {
  try {
    const raw = safeStorage.getItem('aj-site-contact');
    if (raw) {
      return { ...defaultContactDetails, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore parse error
  }
  return defaultContactDetails;
}

function persistStoredContact(contact: ContactDetails) {
  try {
    safeStorage.setItem('aj-site-contact', JSON.stringify(contact));
  } catch {
    // Ignore storage quota error
  }
}

/**
 * Public hook to retrieve the current site contact details and coordinates.
 * Always returns a valid ContactDetails object immediately, updating as soon as the API responds.
 */
export function useSiteContact(): {
  contact: ContactDetails;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useQuery<ContactDetails>({
    queryKey: ['site-contact'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/site/contact');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        persistStoredContact(data);
        return data;
      } catch (err) {
        return getStoredContact();
      }
    },
    initialData: getStoredContact,
    staleTime: 60_000,
  });

  return {
    contact: query.data || defaultContactDetails,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Admin hook to retrieve full contact details
 */
export function useAdminContact() {
  return useQuery<ContactDetails>({
    queryKey: ['admin-contact'],
    queryFn: async () => {
      const token = safeStorage.getItem('aj-auth-token');
      const res = await fetch('/api/admin/contact', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        // Try fallback to public
        const pubRes = await fetch('/api/site/contact');
        if (pubRes.ok) return await pubRes.json();
        throw new Error(`Failed to load contact details (HTTP ${res.status})`);
      }
      const data = await res.json();
      persistStoredContact(data);
      return data;
    },
    initialData: getStoredContact,
  });
}

/**
 * Admin mutation to update contact details and coordinates
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<ContactDetails>) => {
      const token = safeStorage.getItem('aj-auth-token');
      const res = await fetch('/api/admin/contact', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Failed to save contact details (HTTP ${res.status})`);
      }
      const data = await res.json();
      const updated = data.contact || payload;
      persistStoredContact(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-contact'], updated);
      queryClient.setQueryData(['site-contact'], updated);
      queryClient.invalidateQueries({ queryKey: ['site-contact'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contact'] });
    },
  });
}

/**
 * Admin mutation to reset contact details to defaults
 */
export function useResetContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = safeStorage.getItem('aj-auth-token');
      const res = await fetch('/api/admin/contact/reset', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to reset contact details (HTTP ${res.status})`);
      }
      const data = await res.json();
      const resetData = data.contact || defaultContactDetails;
      persistStoredContact(resetData);
      return resetData;
    },
    onSuccess: (resetData) => {
      queryClient.setQueryData(['admin-contact'], resetData);
      queryClient.setQueryData(['site-contact'], resetData);
      queryClient.invalidateQueries({ queryKey: ['site-contact'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contact'] });
    },
  });
}
