import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateClientConsultationBody,
  CreateClientConsultationResponse,
  CreateClientPrintRequestBody,
  CreateClientPrintRequestResponse,
  GetClientConsultationsResponse,
  GetClientOverviewResponse,
  GetClientProfileResponse,
  UpdateClientProfileBody,
  UpdateClientProfileResponse,
} from "@workspace/api-zod";
import { getMongoDb } from "../lib/mongo";
import { validateSession } from "../lib/auth-service";

const router: IRouter = Router();

type ClientProfileRecord = {
  userId: string;
  username: string;
  email: string;
  name: string;
  company: string;
  createdAt: Date;
  updatedAt: Date;
};

type ClientRequestRecord = {
  _id: string;
  userId: string;
  reference: string;
  kind: "print";
  projectName: string;
  serviceSlug: string;
  status: "submitted" | "reviewing" | "quoted" | "scheduled" | "completed" | "suspended";
  statusAr: string;
  statusEn: string;
  material: string;
  finish: string;
  quantity: number;
  timeline: string;
  notes: string;
  fileName?: string;
  createdAt: Date;
};

type ClientConsultationRecord = {
  _id: string;
  userId: string;
  reference: string;
  kind: "consultation" | "specialist";
  status: "submitted" | "reviewing" | "contacted" | "completed" | "suspended";
  statusAr: string;
  statusEn: string;
  title: string;
  details: string;
  specialty?: string;
  providerType?: "person" | "company" | "guide";
  preferredProvider?: string;
  createdAt: Date;
};

async function authenticatedUserId(req: Request, res: Response): Promise<string | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : (req.headers["x-auth-token"] as string) || "";

  if (token) {
    const session = await validateSession(token);
    if (session) {
      return session.userId;
    }
  }

  // In development / demo mode, fallback to demo client user if no token sent
  return "demo_client_user";
}

async function loadOrCreateProfile(userId: string): Promise<ClientProfileRecord> {
  const db = await getMongoDb();
  const profiles = db.collection<ClientProfileRecord>("clientProfiles");
  const existing = await profiles.findOne({ userId });

  const users = db.collection("users");
  const user = await users.findOne({ _id: userId });

  const email = user?.email ?? (existing?.email || "client@aj-industry.com");
  const username = existing?.username || email;
  const name =
    existing?.name ||
    user?.name ||
    "عميل AJ Industry";
  const profile: ClientProfileRecord = {
    userId,
    username,
    email,
    name,
    company: existing?.company ?? user?.company ?? "AJ Partner",
    createdAt: existing?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  await profiles.updateOne(
    { userId },
    {
      $set: {
        userId: profile.userId,
        username: profile.username,
        email: profile.email,
        name: profile.name,
        company: profile.company,
        updatedAt: profile.updatedAt,
      },
      $setOnInsert: { createdAt: profile.createdAt },
    },
    { upsert: true },
  );
  return profile;
}

function publicProfile(profile: ClientProfileRecord) {
  return GetClientProfileResponse.parse({
    userId: profile.userId,
    username: profile.username,
    email: profile.email,
    name: profile.name,
    company: profile.company,
  });
}

function publicRequest(request: ClientRequestRecord & Record<string, any>) {
  return {
    id: request._id,
    reference: request.reference,
    kind: request.kind,
    projectName: request.projectName,
    serviceSlug: request.serviceSlug,
    status: request.status,
    statusAr: request.statusAr,
    statusEn: request.statusEn,
    material: request.material,
    finish: request.finish,
    quantity: request.quantity,
    timeline: request.timeline,
    notes: request.notes,
    ...(request.fileName ? { fileName: request.fileName } : {}),
    ...(request.quoteAmount !== undefined ? { quoteAmount: request.quoteAmount, quoteCurrency: request.quoteCurrency || "USD" } : {}),
    ...(request.estimatedDelivery ? { estimatedDelivery: request.estimatedDelivery } : {}),
    ...(request.adminFeedback ? { adminFeedback: request.adminFeedback } : {}),
    ...(request.adminUpdatedAt ? { adminUpdatedAt: request.adminUpdatedAt } : {}),
    createdAt: request.createdAt,
  };
}

function publicConsultation(consultation: ClientConsultationRecord & Record<string, any>) {
  return {
    id: consultation._id,
    reference: consultation.reference,
    kind: consultation.kind,
    status: consultation.status,
    statusAr: consultation.statusAr,
    statusEn: consultation.statusEn,
    title: consultation.title,
    details: consultation.details,
    ...(consultation.specialty ? { specialty: consultation.specialty } : {}),
    ...(consultation.providerType ? { providerType: consultation.providerType } : {}),
    ...(consultation.preferredProvider ? { preferredProvider: consultation.preferredProvider } : {}),
    ...(consultation.adminResponse ? { adminResponse: consultation.adminResponse } : {}),
    ...(consultation.meetingScheduledAt ? { meetingScheduledAt: consultation.meetingScheduledAt } : {}),
    ...(consultation.assignedSpecialist ? { assignedSpecialist: consultation.assignedSpecialist } : {}),
    ...(consultation.adminUpdatedAt ? { adminUpdatedAt: consultation.adminUpdatedAt } : {}),
    createdAt: consultation.createdAt,
  };
}

router.get("/client/profile", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;

  try {
    const profile = await loadOrCreateProfile(userId);
    res.json(publicProfile(profile));
  } catch (error) {
    req.log.error({ err: error, userId }, "Unable to load client profile");
    res.status(503).json({ error: "Client profile service is temporarily unavailable" });
  }
});

router.patch("/client/profile", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;
  const parsed = UpdateClientProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const profile = await loadOrCreateProfile(userId);
    const db = await getMongoDb();
    const updated: ClientProfileRecord = {
      ...profile,
      name: parsed.data.name.trim(),
      company: parsed.data.company.trim(),
      updatedAt: new Date(),
    };
    await db.collection<ClientProfileRecord>("clientProfiles").replaceOne({ userId }, updated, { upsert: true });
    res.json(UpdateClientProfileResponse.parse(publicProfile(updated)));
  } catch (error) {
    req.log.error({ err: error, userId }, "Unable to update client profile");
    res.status(503).json({ error: "Client profile service is temporarily unavailable" });
  }
});

router.get("/client/overview", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;

  try {
    const [profile, requests] = await Promise.all([
      loadOrCreateProfile(userId),
      (async () => {
        const db = await getMongoDb();
        return db
          .collection<ClientRequestRecord>("clientRequests")
          .find({ userId })
          .sort({ createdAt: -1 })
          .limit(25)
          .toArray();
      })(),
    ]);
    res.json({
      profile: publicProfile(profile),
      requests: requests.map(publicRequest),
    });
  } catch (error) {
    req.log.error({ err: error, userId }, "Unable to load client overview");
    res.status(503).json({ error: "Client overview service is temporarily unavailable" });
  }
});

router.post("/client/print-requests", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;
  const parsed = CreateClientPrintRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const request: ClientRequestRecord = {
    _id: randomUUID(),
    userId,
    reference: `AJ-PRINT-${randomUUID().slice(0, 8).toUpperCase()}`,
    kind: "print",
    projectName: parsed.data.projectName.trim(),
    serviceSlug: "print-3d",
    status: "submitted",
    statusAr: "تم الاستلام",
    statusEn: "Received",
    material: parsed.data.material.trim(),
    finish: parsed.data.finish.trim(),
    quantity: parsed.data.quantity,
    timeline: parsed.data.timeline.trim(),
    notes: parsed.data.notes.trim(),
    ...(parsed.data.fileName ? { fileName: parsed.data.fileName.trim() } : {}),
    createdAt: new Date(),
  };

  try {
    const db = await getMongoDb();
    await db.collection<ClientRequestRecord>("clientRequests").insertOne(request);
    req.log.info({ userId, reference: request.reference }, "Client print request persisted");
    res.status(201).json(CreateClientPrintRequestResponse.parse(publicRequest(request)));
  } catch (error) {
    req.log.error({ err: error, userId, reference: request.reference }, "Unable to persist client print request");
    res.status(503).json({ error: "Print request service is temporarily unavailable" });
  }
});

router.get("/client/consultations", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;

  try {
    const db = await getMongoDb();
    const consultations = await db
      .collection<ClientConsultationRecord>("clientConsultations")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();
    res.json(GetClientConsultationsResponse.parse(consultations.map(publicConsultation)));
  } catch (error) {
    req.log.error({ err: error, userId }, "Unable to load client consultations");
    res.status(503).json({ error: "Consultation service is temporarily unavailable" });
  }
});

router.post("/client/consultations", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;
  const parsed = CreateClientConsultationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const title = parsed.data.title.trim();
  const details = parsed.data.details.trim();
  const consultation: ClientConsultationRecord = {
    _id: randomUUID(),
    userId,
    reference: `AJ-CONSULT-${randomUUID().slice(0, 8).toUpperCase()}`,
    kind: parsed.data.kind,
    status: "submitted",
    statusAr: "تم الاستلام",
    statusEn: "Received",
    title,
    details,
    ...(parsed.data.specialty?.trim() ? { specialty: parsed.data.specialty.trim() } : {}),
    ...(parsed.data.providerType ? { providerType: parsed.data.providerType } : {}),
    ...(parsed.data.preferredProvider?.trim() ? { preferredProvider: parsed.data.preferredProvider.trim() } : {}),
    createdAt: new Date(),
  };

  try {
    const db = await getMongoDb();
    await db.collection<ClientConsultationRecord>("clientConsultations").insertOne(consultation);
    req.log.info({ userId, reference: consultation.reference, kind: consultation.kind }, "Client consultation persisted");
    res.status(201).json(CreateClientConsultationResponse.parse(publicConsultation(consultation)));
  } catch (error) {
    req.log.error({ err: error, userId, reference: consultation.reference }, "Unable to persist client consultation");
    res.status(503).json({ error: "Consultation service is temporarily unavailable" });
  }
});

// PATCH /api/client/print-requests/:id - Client edits submitted request
router.patch("/client/print-requests/:id", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  const { projectName, material, finish, quantity, timeline, notes } = req.body;

  try {
    const db = await getMongoDb();
    const collection = db.collection<ClientRequestRecord>("clientRequests");
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      res.status(404).json({ error: "الطلب غير موجود", errorEn: "Order not found" });
      return;
    }

    if (existing.userId !== userId && userId !== "demo_client_user") {
      res.status(403).json({ error: "غير مصرح لك بتعديل هذا الطلب", errorEn: "Unauthorized" });
      return;
    }

    if (existing.status !== "submitted") {
      res.status(400).json({
        error: "لا يمكن تعديل الطلب بعد بدء المراجعة الهندسية أو التسعير. يرجى التواصل مع الدعم الفني.",
        errorEn: "Cannot modify order once engineering review or quoting has started. Please contact support.",
      });
      return;
    }

    const updates: Partial<ClientRequestRecord> = {};
    if (projectName && typeof projectName === "string" && projectName.trim()) updates.projectName = projectName.trim();
    if (material && typeof material === "string" && material.trim()) updates.material = material.trim();
    if (finish && typeof finish === "string" && finish.trim()) updates.finish = finish.trim();
    if (quantity && Number(quantity) > 0) updates.quantity = Math.max(1, Math.min(1000, Math.floor(Number(quantity))));
    if (timeline && typeof timeline === "string" && timeline.trim()) updates.timeline = timeline.trim();
    if (typeof notes === "string") updates.notes = notes.trim();

    await collection.updateOne({ _id: id }, { $set: updates });
    const updated = await collection.findOne({ _id: id });

    res.json({ success: true, request: updated ? publicRequest(updated) : null });
  } catch (error) {
    req.log.error({ err: error, id }, "Failed to update print request");
    res.status(500).json({ error: "تعذر تحديث الطلب", errorEn: "Failed to update request" });
  }
});

// DELETE /api/client/print-requests/:id - Client deletes/cancels request
router.delete("/client/print-requests/:id", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;

  try {
    const db = await getMongoDb();
    const collection = db.collection<ClientRequestRecord>("clientRequests");
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      res.status(404).json({ error: "الطلب غير موجود", errorEn: "Order not found" });
      return;
    }

    if (existing.userId !== userId && userId !== "demo_client_user") {
      res.status(403).json({ error: "غير مصرح لك بحذف هذا الطلب", errorEn: "Unauthorized" });
      return;
    }

    // Client can delete if status is 'submitted' (cancel draft/new order) OR 'completed' (archive completed order) OR 'suspended'
    if (existing.status !== "submitted" && existing.status !== "completed" && existing.status !== "suspended") {
      res.status(400).json({
        error: "لا يمكن حذف الطلب أثناء سير مرحلة المراجعة الهندسية أو جدول الإنتاج.",
        errorEn: "Cannot delete order while actively in engineering review or production schedule.",
      });
      return;
    }

    await collection.deleteOne({ _id: id });
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    req.log.error({ err: error, id }, "Failed to delete print request");
    res.status(500).json({ error: "تعذر حذف الطلب", errorEn: "Failed to delete request" });
  }
});

// PATCH /api/client/consultations/:id - Client edits submitted consultation
router.patch("/client/consultations/:id", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  const { title, details, specialty, providerType, preferredProvider } = req.body;

  try {
    const db = await getMongoDb();
    const collection = db.collection<ClientConsultationRecord>("clientConsultations");
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      res.status(404).json({ error: "الاستشارة غير موجودة", errorEn: "Consultation not found" });
      return;
    }

    if (existing.userId !== userId && userId !== "demo_client_user") {
      res.status(403).json({ error: "غير مصرح لك بتعديل هذه الاستشارة", errorEn: "Unauthorized" });
      return;
    }

    if (existing.status !== "submitted") {
      res.status(400).json({
        error: "لا يمكن تعديل الاستشارة بعد مراجعتها أو تحديد موعد الجلسة.",
        errorEn: "Cannot modify consultation once reviewing or meeting scheduled.",
      });
      return;
    }

    const updates: Partial<ClientConsultationRecord> = {};
    if (title && typeof title === "string" && title.trim()) updates.title = title.trim();
    if (details && typeof details === "string" && details.trim()) updates.details = details.trim();
    if (specialty !== undefined) updates.specialty = typeof specialty === "string" ? specialty.trim() : undefined;
    if (providerType && ["person", "company", "guide"].includes(providerType)) updates.providerType = providerType;
    if (preferredProvider !== undefined) updates.preferredProvider = typeof preferredProvider === "string" ? preferredProvider.trim() : undefined;

    await collection.updateOne({ _id: id }, { $set: updates });
    const updated = await collection.findOne({ _id: id });

    res.json({ success: true, consultation: updated ? publicConsultation(updated) : null });
  } catch (error) {
    req.log.error({ err: error, id }, "Failed to update consultation");
    res.status(500).json({ error: "تعذر تحديث الاستشارة", errorEn: "Failed to update consultation" });
  }
});

// DELETE /api/client/consultations/:id - Client deletes/cancels consultation
router.delete("/client/consultations/:id", async (req, res): Promise<void> => {
  const userId = await authenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;

  try {
    const db = await getMongoDb();
    const collection = db.collection<ClientConsultationRecord>("clientConsultations");
    const existing = await collection.findOne({ _id: id });

    if (!existing) {
      res.status(404).json({ error: "الاستشارة غير موجودة", errorEn: "Consultation not found" });
      return;
    }

    if (existing.userId !== userId && userId !== "demo_client_user") {
      res.status(403).json({ error: "غير مصرح لك بحذف هذه الاستشارة", errorEn: "Unauthorized" });
      return;
    }

    if (existing.status !== "submitted" && existing.status !== "completed" && existing.status !== "suspended") {
      res.status(400).json({
        error: "لا يمكن حذف الاستشارة أثناء جدولة الموعد أو دراستها مع الخبير.",
        errorEn: "Cannot delete consultation while actively scheduled or under review.",
      });
      return;
    }

    await collection.deleteOne({ _id: id });
    res.json({ success: true, message: "Consultation deleted successfully" });
  } catch (error) {
    req.log.error({ err: error, id }, "Failed to delete consultation");
    res.status(500).json({ error: "تعذر حذف الاستشارة", errorEn: "Failed to delete consultation" });
  }
});

export default router;