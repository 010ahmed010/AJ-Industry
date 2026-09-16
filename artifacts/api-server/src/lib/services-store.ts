import { getMongoDb } from "./mongo";
import { services as defaultServices } from "./site-content";
import type { ServiceDetail } from "@workspace/api-zod";

export interface StoredService extends ServiceDetail {
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

function cleanServiceDoc(doc: any): ServiceDetail & { order: number; createdAt: string; updatedAt: string } {
  return {
    slug: doc.slug,
    titleAr: doc.titleAr,
    titleEn: doc.titleEn,
    descriptionAr: doc.descriptionAr,
    descriptionEn: doc.descriptionEn,
    category: doc.category,
    duration: doc.duration,
    accent: doc.accent,
    highlightsAr: Array.isArray(doc.highlightsAr) ? doc.highlightsAr : [],
    highlightsEn: Array.isArray(doc.highlightsEn) ? doc.highlightsEn : [],
    workflowAr: Array.isArray(doc.workflowAr) ? doc.workflowAr : [],
    workflowEn: Array.isArray(doc.workflowEn) ? doc.workflowEn : [],
    gallery: Array.isArray(doc.gallery) ? doc.gallery.slice(0, 3) : [],
    order: typeof doc.order === "number" ? doc.order : 999,
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString(),
  };
}

let isInitialized = false;

export async function initServicesIfNeeded(): Promise<void> {
  try {
    const db = await getMongoDb();
    const collection = db.collection("services");
    const count = await collection.countDocuments({});
    if (count === 0) {
      const now = new Date().toISOString();
      const seedDocs = defaultServices.map((svc, idx) => ({
        ...svc,
        order: idx + 1,
        createdAt: now,
        updatedAt: now,
      }));
      for (const doc of seedDocs) {
        await collection.insertOne(doc);
      }
    }
    isInitialized = true;
  } catch (err) {
    console.error("[ServicesStore] Failed to initialize services collection:", err);
  }
}

export async function getAllServices(): Promise<(ServiceDetail & { order: number })[]> {
  await initServicesIfNeeded();
  try {
    const db = await getMongoDb();
    const collection = db.collection("services");
    const docs = await collection.find({}).sort({ order: 1 }).toArray();
    if (!docs || docs.length === 0) {
      return defaultServices.map((s, idx) => ({ ...s, order: idx + 1 }));
    }
    return docs.map(cleanServiceDoc);
  } catch (err) {
    console.error("[ServicesStore] getAllServices error:", err);
    return defaultServices.map((s, idx) => ({ ...s, order: idx + 1 }));
  }
}

export async function getServiceBySlug(slug: string): Promise<ServiceDetail | null> {
  await initServicesIfNeeded();
  try {
    const db = await getMongoDb();
    const collection = db.collection("services");
    const doc = await collection.findOne({ slug });
    if (doc) {
      return cleanServiceDoc(doc);
    }
    const fallback = defaultServices.find((s) => s.slug === slug);
    return fallback || null;
  } catch (err) {
    console.error(`[ServicesStore] getServiceBySlug error for slug ${slug}:`, err);
    const fallback = defaultServices.find((s) => s.slug === slug);
    return fallback || null;
  }
}

export async function createService(serviceData: StoredService): Promise<ServiceDetail> {
  await initServicesIfNeeded();
  const db = await getMongoDb();
  const collection = db.collection("services");

  // Validate slug uniqueness
  const existing = await collection.findOne({ slug: serviceData.slug });
  if (existing) {
    throw new Error(`A service with slug "${serviceData.slug}" already exists`);
  }

  // Ensure gallery has at least 3 items
  const gallery = [...(serviceData.gallery || [])];
  while (gallery.length < 3) {
    const idx = gallery.length + 1;
    gallery.push({
      image: "/media/why-we-1.jpeg",
      titleAr: `نموذج العمل 0${idx}`,
      titleEn: `Case Study 0${idx}`,
      descriptionAr: "وصف توضيحي للمشروع والتطبيق الهندسي في الموقع الصناعي.",
      descriptionEn: "Demonstration of practical application on the industrial floor.",
    });
  }

  const all = await collection.find({}).toArray();
  const maxOrder = all.reduce((max, item) => Math.max(max, item.order || 0), 0);
  const now = new Date().toISOString();

  const newDoc = {
    slug: serviceData.slug,
    titleAr: serviceData.titleAr,
    titleEn: serviceData.titleEn,
    descriptionAr: serviceData.descriptionAr,
    descriptionEn: serviceData.descriptionEn,
    category: serviceData.category || "Machine design",
    duration: serviceData.duration || "2–4 weeks",
    accent: serviceData.accent || "cyan",
    highlightsAr: serviceData.highlightsAr || [],
    highlightsEn: serviceData.highlightsEn || [],
    workflowAr: serviceData.workflowAr || [],
    workflowEn: serviceData.workflowEn || [],
    gallery: gallery.slice(0, 3),
    order: serviceData.order ?? maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(newDoc);
  return cleanServiceDoc(newDoc);
}

export async function updateService(slug: string, updates: Partial<StoredService>): Promise<ServiceDetail | null> {
  await initServicesIfNeeded();
  const db = await getMongoDb();
  const collection = db.collection("services");

  const existing = await collection.findOne({ slug });
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    ...updates,
    updatedAt: now,
  };
  delete updatePayload._id;

  // If gallery is updated, ensure it is capped at 3 items
  if (updates.gallery) {
    updatePayload.gallery = updates.gallery.slice(0, 3);
  }

  await collection.updateOne({ slug }, { $set: updatePayload });
  const updatedDoc = await collection.findOne({ slug: updates.slug || slug });
  return updatedDoc ? cleanServiceDoc(updatedDoc) : null;
}

export async function deleteService(slug: string): Promise<boolean> {
  await initServicesIfNeeded();
  const db = await getMongoDb();
  const collection = db.collection("services");
  const result = await collection.deleteOne({ slug });
  return (result?.deletedCount || 0) > 0;
}

export async function resetServicesToDefaults(): Promise<ServiceDetail[]> {
  const db = await getMongoDb();
  const collection = db.collection("services");
  await collection.deleteMany({});
  const now = new Date().toISOString();
  const seedDocs = defaultServices.map((svc, idx) => ({
    ...svc,
    order: idx + 1,
    createdAt: now,
    updatedAt: now,
  }));
  for (const doc of seedDocs) {
    await collection.insertOne(doc);
  }
  return getAllServices();
}
