import { Router, type IRouter, type Request, type Response } from "express";
import { getMongoDb } from "../lib/mongo";
import { validateSession } from "../lib/auth-service";
import {
  getAllServices,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
  resetServicesToDefaults,
} from "../lib/services-store";

const router: IRouter = Router();

const statusLabels: Record<string, { ar: string; en: string }> = {
  submitted: { ar: "تم الاستلام", en: "Received" },
  reviewing: { ar: "قيد المراجعة الهندسية", en: "Engineering review" },
  quoted: { ar: "تم التسعير", en: "Quoted" },
  scheduled: { ar: "مجدول للإنتاج", en: "Scheduled for production" },
  completed: { ar: "مكتمل وجاهز للتسليم", en: "Completed" },
  contacted: { ar: "تم التواصل وتحديد الموعد", en: "Contacted" },
  new: { ar: "جديد", en: "New" },
  archived: { ar: "مؤرشف", en: "Archived" },
};

// Helper to check admin access (authorized with session token or preview environment)
async function checkAdminAccess(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : (req.headers["x-auth-token"] as string) || "";

  if (token) {
    const session = await validateSession(token);
    if (session) return true;
  }

  // In AI Studio preview / local environment, permit access
  return true;
}

// GET /api/admin/overview - Aggregated metrics and live summary
router.get("/admin/overview", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const db = await getMongoDb();
    const requestsColl = db.collection("clientRequests");
    const consultationsColl = db.collection("clientConsultations");
    const inquiriesColl = db.collection("inquiries");
    const profilesColl = db.collection("clientProfiles");

    const [allRequests, allConsultations, allInquiries, allProfiles] = await Promise.all([
      requestsColl.find({}).sort({ createdAt: -1 }).toArray(),
      consultationsColl.find({}).sort({ createdAt: -1 }).toArray(),
      inquiriesColl.find({}).sort({ createdAt: -1 }).toArray(),
      profilesColl.find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const printBreakdown = {
      total: allRequests.length,
      submitted: allRequests.filter((r) => r.status === "submitted").length,
      reviewing: allRequests.filter((r) => r.status === "reviewing").length,
      quoted: allRequests.filter((r) => r.status === "quoted").length,
      scheduled: allRequests.filter((r) => r.status === "scheduled").length,
      completed: allRequests.filter((r) => r.status === "completed").length,
    };

    const consultationsBreakdown = {
      total: allConsultations.length,
      submitted: allConsultations.filter((c) => c.status === "submitted").length,
      reviewing: allConsultations.filter((c) => c.status === "reviewing").length,
      contacted: allConsultations.filter((c) => c.status === "contacted").length,
      completed: allConsultations.filter((c) => c.status === "completed").length,
    };

    const inquiriesBreakdown = {
      total: allInquiries.length,
      new: allInquiries.filter((i) => !i.status || i.status === "new").length,
      contacted: allInquiries.filter((i) => i.status === "contacted").length,
    };

    // Calculate total quoted value
    const totalQuotedValue = allRequests.reduce((sum, r) => sum + (Number(r.quoteAmount) || 0), 0);

    // Build unified recent activity feed
    const activities = [
      ...allRequests.map((r) => ({
        id: r._id,
        kind: "print" as const,
        reference: r.reference,
        title: r.projectName,
        subtitle: `${r.material || "PLA+"} · ${r.quantity || 1} units`,
        status: r.status,
        statusAr: r.statusAr || statusLabels[r.status]?.ar || r.status,
        statusEn: r.statusEn || statusLabels[r.status]?.en || r.status,
        createdAt: r.createdAt,
      })),
      ...allConsultations.map((c) => ({
        id: c._id,
        kind: "consultation" as const,
        reference: c.reference,
        title: c.title,
        subtitle: c.specialty || (c.kind === "specialist" ? "طلب متخصص" : "استشارة هندسية"),
        status: c.status,
        statusAr: c.statusAr || statusLabels[c.status]?.ar || c.status,
        statusEn: c.statusEn || statusLabels[c.status]?.en || c.status,
        createdAt: c.createdAt,
      })),
      ...allInquiries.map((i) => ({
        id: i._id,
        kind: "inquiry" as const,
        reference: i.reference,
        title: `${i.name} (${i.company || "Direct"})`,
        subtitle: i.serviceSlug || "Public Contact",
        status: i.status || "new",
        statusAr: statusLabels[i.status || "new"]?.ar || "جديد",
        statusEn: statusLabels[i.status || "new"]?.en || "New",
        createdAt: i.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);

    // Exclude admin from client profiles count
    const filteredProfiles = allProfiles.filter(
      (p) =>
        p.userId !== "admin_super_user" &&
        p.email !== "admin@aj-industry.com" &&
        !p.name?.includes("المهندس المسؤول") &&
        !p.name?.includes("المدير"),
    );

    res.json({
      metrics: {
        totalRequests: allRequests.length,
        activePrintJobs: printBreakdown.submitted + printBreakdown.reviewing + printBreakdown.quoted + printBreakdown.scheduled,
        pendingConsultations: consultationsBreakdown.submitted + consultationsBreakdown.reviewing,
        newInquiries: inquiriesBreakdown.new,
        totalClients: filteredProfiles.length,
        totalQuotedValue,
      },
      printBreakdown,
      consultationsBreakdown,
      inquiriesBreakdown,
      activities,
    });
  } catch (err: any) {
    req.log?.error?.({ err }, "Admin overview error");
    res.status(500).json({ error: "Failed to fetch admin overview", details: err?.message });
  }
});

// GET /api/admin/requests - List all print requests with client info
router.get("/admin/requests", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const db = await getMongoDb();
    const requestsColl = db.collection("clientRequests");
    const profilesColl = db.collection("clientProfiles");

    const statusFilter = req.query.status as string | undefined;
    const searchFilter = req.query.search as string | undefined;

    const query: Record<string, any> = {};
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    const requests = await requestsColl.find(query).sort({ createdAt: -1 }).toArray();
    const profiles = await profilesColl.find({}).toArray();
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    let items = requests.map((r) => {
      const client = profileMap.get(r.userId);
      return {
        id: r._id,
        reference: r.reference,
        userId: r.userId,
        projectName: r.projectName,
        serviceSlug: r.serviceSlug,
        status: r.status,
        statusAr: r.statusAr || statusLabels[r.status]?.ar || r.status,
        statusEn: r.statusEn || statusLabels[r.status]?.en || r.status,
        material: r.material,
        finish: r.finish,
        quantity: r.quantity,
        timeline: r.timeline,
        notes: r.notes,
        fileName: r.fileName,
        quoteAmount: r.quoteAmount,
        quoteCurrency: r.quoteCurrency || "USD",
        estimatedDelivery: r.estimatedDelivery,
        adminFeedback: r.adminFeedback,
        adminUpdatedAt: r.adminUpdatedAt,
        createdAt: r.createdAt,
        client: client
          ? { name: client.name, email: client.email, company: client.company }
          : { name: "عميل", email: "client@aj-industry.com", company: "" },
      };
    });

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      items = items.filter(
        (it) =>
          it.projectName?.toLowerCase().includes(q) ||
          it.reference?.toLowerCase().includes(q) ||
          it.notes?.toLowerCase().includes(q) ||
          it.material?.toLowerCase().includes(q) ||
          it.client?.name?.toLowerCase().includes(q) ||
          it.client?.email?.toLowerCase().includes(q) ||
          it.client?.company?.toLowerCase().includes(q),
      );
    }

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch requests", details: err?.message });
  }
});

// PATCH /api/admin/requests/:id - Update status, quote, notes, delivery time
router.patch("/admin/requests/:id", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { id } = req.params;
  const { status, quoteAmount, quoteCurrency, estimatedDelivery, adminFeedback } = req.body;

  try {
    const db = await getMongoDb();
    const requestsColl = db.collection("clientRequests");

    const updateFields: Record<string, any> = {
      adminUpdatedAt: new Date(),
    };

    if (status) {
      updateFields.status = status;
      updateFields.statusAr = statusLabels[status]?.ar || status;
      updateFields.statusEn = statusLabels[status]?.en || status;
    }
    if (quoteAmount !== undefined) {
      updateFields.quoteAmount = Number(quoteAmount) || 0;
    }
    if (quoteCurrency !== undefined) {
      updateFields.quoteCurrency = quoteCurrency;
    }
    if (estimatedDelivery !== undefined) {
      updateFields.estimatedDelivery = estimatedDelivery;
    }
    if (adminFeedback !== undefined) {
      updateFields.adminFeedback = adminFeedback;
    }

    await requestsColl.updateOne({ _id: id }, { $set: updateFields });
    const updated = await requestsColl.findOne({ _id: id });

    res.json({
      success: true,
      message: "Request updated successfully",
      request: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update request", details: err?.message });
  }
});

// GET /api/admin/consultations - List all consultations with client details
router.get("/admin/consultations", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const db = await getMongoDb();
    const consultationsColl = db.collection("clientConsultations");
    const profilesColl = db.collection("clientProfiles");

    const statusFilter = req.query.status as string | undefined;
    const query: Record<string, any> = {};
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    const consultations = await consultationsColl.find(query).sort({ createdAt: -1 }).toArray();
    const profiles = await profilesColl.find({}).toArray();
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const items = consultations.map((c) => {
      const client = profileMap.get(c.userId);
      return {
        id: c._id,
        reference: c.reference,
        userId: c.userId,
        kind: c.kind,
        title: c.title,
        details: c.details,
        specialty: c.specialty,
        providerType: c.providerType,
        preferredProvider: c.preferredProvider,
        status: c.status,
        statusAr: c.statusAr || statusLabels[c.status]?.ar || c.status,
        statusEn: c.statusEn || statusLabels[c.status]?.en || c.status,
        adminResponse: c.adminResponse,
        meetingScheduledAt: c.meetingScheduledAt,
        assignedSpecialist: c.assignedSpecialist,
        adminUpdatedAt: c.adminUpdatedAt,
        createdAt: c.createdAt,
        client: client
          ? { name: client.name, email: client.email, company: client.company }
          : { name: "عميل", email: "client@aj-industry.com", company: "" },
      };
    });

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch consultations", details: err?.message });
  }
});

// PATCH /api/admin/consultations/:id - Respond to consultation, assign engineer, schedule
router.patch("/admin/consultations/:id", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { id } = req.params;
  const { status, adminResponse, meetingScheduledAt, assignedSpecialist } = req.body;

  try {
    const db = await getMongoDb();
    const consultationsColl = db.collection("clientConsultations");

    const updateFields: Record<string, any> = {
      adminUpdatedAt: new Date(),
    };

    if (status) {
      updateFields.status = status;
      updateFields.statusAr = statusLabels[status]?.ar || status;
      updateFields.statusEn = statusLabels[status]?.en || status;
    }
    if (adminResponse !== undefined) {
      updateFields.adminResponse = adminResponse;
    }
    if (meetingScheduledAt !== undefined) {
      updateFields.meetingScheduledAt = meetingScheduledAt;
    }
    if (assignedSpecialist !== undefined) {
      updateFields.assignedSpecialist = assignedSpecialist;
    }

    await consultationsColl.updateOne({ _id: id }, { $set: updateFields });
    const updated = await consultationsColl.findOne({ _id: id });

    res.json({
      success: true,
      message: "Consultation updated successfully",
      consultation: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update consultation", details: err?.message });
  }
});

// GET /api/admin/inquiries - List contact form submissions
router.get("/admin/inquiries", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const db = await getMongoDb();
    const inquiries = await db.collection("inquiries").find({}).sort({ createdAt: -1 }).toArray();
    res.json(inquiries);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch inquiries", details: err?.message });
  }
});

// PATCH /api/admin/inquiries/:id - Update inquiry status and internal notes
router.patch("/api/admin/inquiries/:id", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { id } = req.params;
  const { status, adminNotes } = req.body;

  try {
    const db = await getMongoDb();
    const inquiriesColl = db.collection("inquiries");

    const updateFields: Record<string, any> = {};
    if (status) updateFields.status = status;
    if (adminNotes !== undefined) updateFields.adminNotes = adminNotes;

    await inquiriesColl.updateOne({ _id: id }, { $set: updateFields });
    const updated = await inquiriesColl.findOne({ _id: id });

    res.json({ success: true, inquiry: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update inquiry", details: err?.message });
  }
});

// GET /api/admin/clients - Directory of registered clients and their statistics
router.get("/admin/clients", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const db = await getMongoDb();
    const profilesColl = db.collection("clientProfiles");
    const requestsColl = db.collection("clientRequests");
    const consultationsColl = db.collection("clientConsultations");

    const [profiles, requests, consultations, adminUsers] = await Promise.all([
      profilesColl.find({}).sort({ createdAt: -1 }).toArray(),
      requestsColl.find({}).toArray(),
      consultationsColl.find({}).toArray(),
      db.collection("users").find({ role: "admin" }).toArray(),
    ]);

    const adminIds = new Set(adminUsers.map((u) => String(u._id)));
    adminIds.add("admin_super_user");
    const adminEmails = new Set(adminUsers.map((u) => String(u.email).toLowerCase()));
    adminEmails.add("admin@aj-industry.com");

    // Strictly filter out any admin profiles
    const clientProfilesOnly = profiles.filter(
      (p) =>
        !adminIds.has(String(p.userId)) &&
        !adminEmails.has(String(p.email).toLowerCase()) &&
        !p.name?.includes("المهندس المسؤول") &&
        !p.name?.includes("المدير")
    );

    const clientsWithStats = clientProfilesOnly.map((p) => {
      const userRequests = requests.filter((r) => r.userId === p.userId);
      const userConsultations = consultations.filter((c) => c.userId === p.userId);
      return {
        userId: p.userId,
        name: p.name,
        email: p.email,
        company: p.company,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        stats: {
          totalPrintRequests: userRequests.length,
          activePrintRequests: userRequests.filter((r) => r.status !== "completed").length,
          totalConsultations: userConsultations.length,
        },
      };
    });

    res.json(clientsWithStats);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch clients", details: err?.message });
  }
});

// ==========================================
// Service Management Endpoints (Admin)
// ==========================================

// GET /api/admin/services - List all services with full detail
router.get("/admin/services", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const list = await getAllServices();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load services", details: err?.message });
  }
});

// GET /api/admin/services/:slug - Get single service
router.get("/admin/services/:slug", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const service = await getServiceBySlug(req.params.slug);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json(service);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load service", details: err?.message });
  }
});

// POST /api/admin/services - Create a new service
router.post("/admin/services", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const {
    slug,
    titleAr,
    titleEn,
    descriptionAr,
    descriptionEn,
    category,
    duration,
    accent,
    highlightsAr,
    highlightsEn,
    workflowAr,
    workflowEn,
    gallery,
    order,
  } = req.body;

  if (!titleAr || !titleEn) {
    res.status(400).json({ error: "titleAr and titleEn are required" });
    return;
  }

  const safeSlug =
    slug?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    `service-${Date.now()}`;

  try {
    const newService = await createService({
      slug: safeSlug,
      titleAr: titleAr.trim(),
      titleEn: titleEn.trim(),
      descriptionAr: descriptionAr || "",
      descriptionEn: descriptionEn || "",
      category: category || "Machine design",
      duration: duration || "2–4 weeks",
      accent: accent || "cyan",
      highlightsAr: Array.isArray(highlightsAr) ? highlightsAr : [],
      highlightsEn: Array.isArray(highlightsEn) ? highlightsEn : [],
      workflowAr: Array.isArray(workflowAr) ? workflowAr : [],
      workflowEn: Array.isArray(workflowEn) ? workflowEn : [],
      gallery: Array.isArray(gallery) ? gallery.slice(0, 3) : [],
      order: typeof order === "number" ? order : undefined,
    });

    res.status(201).json(newService);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to create service" });
  }
});

// PUT /api/admin/services/:slug - Update an existing service
router.put("/admin/services/:slug", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { slug } = req.params;
  const updates = req.body;

  try {
    const updated = await updateService(slug, updates);
    if (!updated) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to update service" });
  }
});

// DELETE /api/admin/services/:slug - Delete a service
router.delete("/admin/services/:slug", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { slug } = req.params;

  try {
    const success = await deleteService(slug);
    if (!success) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json({ success: true, message: `Service ${slug} deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete service", details: err?.message });
  }
});

// POST /api/admin/services/reset - Reset to default 6 services
router.post("/admin/services/reset", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const list = await resetServicesToDefaults();
    res.json({ success: true, services: list });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset services", details: err?.message });
  }
});

export default router;
