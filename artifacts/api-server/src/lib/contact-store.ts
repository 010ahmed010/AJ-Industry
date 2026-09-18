import { getMongoDb } from "./mongo";

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
  email: "amj.tech.work@gmail.com",
  secondaryEmail: "hello@aj-industry.com",
  phone: "095 331 6416",
  phoneRaw: "+963953316416",
  whatsapp: "095 331 6416",
  whatsappRaw: "963953316416",
  locationTitleAr: "حلب / سوريا",
  locationTitleEn: "Aleppo / Syria",
  locationSubtitleAr: "المنطقة الصناعية في اعزاز",
  locationSubtitleEn: "AZAZ / INDUSTRIAL ZONE",
  fullAddressAr: "المنطقة الصناعية، اعزاز، حلب، سوريا",
  fullAddressEn: "Azaz Industrial Zone, Aleppo, Syria",
  latitude: 36.5868,
  longitude: 37.0463,
  coordinatesDisplay: "36.5868° N, 37.0463° E",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Azaz%2C%20Aleppo%2C%20Syria",
  workingHoursAr: "الأحد — الخميس / 09:00 — 18:00",
  workingHoursEn: "Sunday — Thursday / 09:00 — 18:00",
  socialLinkedin: "https://linkedin.com",
  socialTwitter: "https://x.com",
  socialInstagram: "",
  socialTelegram: "",
  updatedAt: new Date().toISOString(),
};

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export function buildGoogleMapsUrl(lat: number, lng: number, fallbackLabel?: string): string {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return fallbackLabel
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackLabel)}`
    : "https://maps.google.com";
}

let inMemoryContactCache: ContactDetails = { ...defaultContactDetails };

export async function getContactDetails(): Promise<ContactDetails> {
  try {
    const db = await getMongoDb();
    const collection = db.collection("siteSettings");
    const doc = await collection.findOne({ key: "contact_details" });
    if (doc && doc.value) {
      inMemoryContactCache = { ...defaultContactDetails, ...doc.value };
      return inMemoryContactCache;
    }
  } catch (err) {
    console.warn("[ContactStore] Error reading contact details from DB, using fallback cache:", err);
  }
  return inMemoryContactCache;
}

export async function updateContactDetails(
  partial: Partial<ContactDetails>
): Promise<ContactDetails> {
  const current = await getContactDetails();

  // Validate Latitude if provided
  if (partial.latitude !== undefined) {
    const latNum = Number(partial.latitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      throw new Error("Latitude must be a valid number between -90 and 90");
    }
  }

  // Validate Longitude if provided
  if (partial.longitude !== undefined) {
    const lngNum = Number(partial.longitude);
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      throw new Error("Longitude must be a valid number between -180 and 180");
    }
  }

  // Validate Email if provided
  if (partial.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!partial.email.trim() || !emailRegex.test(partial.email.trim())) {
      throw new Error("A valid primary email address is required");
    }
  }

  // Validate Secondary Email if provided
  if (partial.secondaryEmail && partial.secondaryEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(partial.secondaryEmail.trim())) {
      throw new Error("Secondary email format is invalid");
    }
  }

  // Validate Phone (numbers only, no letters)
  if (partial.phone !== undefined && partial.phone.trim()) {
    if (/[a-zA-Z\u0600-\u06FF]/.test(partial.phone) || /[^\d+\s-]/.test(partial.phone)) {
      throw new Error("Display phone number must contain only numbers, no letters");
    }
  }

  // Validate PhoneRaw (numbers only with optional +, no letters)
  if (partial.phoneRaw !== undefined && partial.phoneRaw.trim()) {
    if (/[a-zA-Z\u0600-\u06FF]/.test(partial.phoneRaw) || /[^\d+]/.test(partial.phoneRaw)) {
      throw new Error("International dial string must contain only numbers, no letters");
    }
  }

  // Validate WhatsApp (numbers only, no letters)
  if (partial.whatsapp !== undefined && partial.whatsapp.trim()) {
    if (/[a-zA-Z\u0600-\u06FF]/.test(partial.whatsapp) || /[^\d+\s-]/.test(partial.whatsapp)) {
      throw new Error("Display WhatsApp number must contain only numbers, no letters");
    }
  }

  // Validate WhatsAppRaw (pure digits only, no letters or symbols)
  if (partial.whatsappRaw !== undefined && partial.whatsappRaw.trim()) {
    if (/[^0-9]/.test(partial.whatsappRaw.trim())) {
      throw new Error("WhatsApp direct digits must contain only numbers, no letters or symbols");
    }
  }

  const lat = typeof partial.latitude === "number" && !isNaN(partial.latitude) ? partial.latitude : current.latitude;
  const lng = typeof partial.longitude === "number" && !isNaN(partial.longitude) ? partial.longitude : current.longitude;

  const phoneRaw =
    partial.phoneRaw !== undefined
      ? partial.phoneRaw.trim()
      : partial.phone
        ? partial.phone.replace(/[^0-9+]/g, "")
        : current.phoneRaw;

  const whatsappRaw =
    partial.whatsappRaw !== undefined
      ? partial.whatsappRaw.replace(/[^0-9]/g, "")
      : partial.whatsapp
        ? partial.whatsapp.replace(/[^0-9]/g, "")
        : current.whatsappRaw;

  const mapsUrl =
    partial.mapsUrl && partial.mapsUrl.trim()
      ? partial.mapsUrl.trim()
      : buildGoogleMapsUrl(lat, lng, partial.fullAddressEn || current.fullAddressEn);

  const coordinatesDisplay =
    partial.coordinatesDisplay && partial.coordinatesDisplay.trim()
      ? partial.coordinatesDisplay.trim()
      : formatCoordinates(lat, lng);

  const updated: ContactDetails = {
    ...current,
    ...partial,
    latitude: lat,
    longitude: lng,
    phoneRaw,
    whatsappRaw,
    mapsUrl,
    coordinatesDisplay,
    updatedAt: new Date().toISOString(),
  };

  inMemoryContactCache = updated;

  try {
    const db = await getMongoDb();
    const collection = db.collection("siteSettings");
    await collection.updateOne(
      { key: "contact_details" },
      { $set: { key: "contact_details", value: updated, updatedAt: updated.updatedAt } },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[ContactStore] Failed to persist contact details to MongoDB, saved in-memory:", err);
  }

  return updated;
}

export async function resetContactDetails(): Promise<ContactDetails> {
  const resetData: ContactDetails = {
    ...defaultContactDetails,
    updatedAt: new Date().toISOString(),
  };

  inMemoryContactCache = resetData;

  try {
    const db = await getMongoDb();
    const collection = db.collection("siteSettings");
    await collection.updateOne(
      { key: "contact_details" },
      { $set: { key: "contact_details", value: resetData, updatedAt: resetData.updatedAt } },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[ContactStore] Failed to reset in MongoDB, reset in-memory:", err);
  }

  return resetData;
}
