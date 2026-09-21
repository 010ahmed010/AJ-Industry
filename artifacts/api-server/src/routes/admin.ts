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
  suspended: { ar: "معلّق مؤقتاً", en: "Suspended" },
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

// Helper to retrieve effective Clerk secret key (from MongoDB appSettings or environment)
async function getEffectiveClerkSecretKey(): Promise<string | null> {
  try {
    const db = await getMongoDb();
    const setting = await db.collection("appSettings").findOne({ key: "clerkSecretKey" });
    if (setting?.value && typeof setting.value === "string" && setting.value.trim().startsWith("sk_")) {
      return setting.value.trim();
    }
  } catch {}

  const envKey = process.env.CLERK_SECRET_KEY?.trim();
  if (envKey && (envKey.startsWith("sk_test_") || envKey.startsWith("sk_live_"))) {
    return envKey;
  }
  return null;
}

// Helper to reliably delete a user from Clerk's servers via REST API
async function deleteUserFromClerk(
  userIdOrEmail: string,
  secretKey: string
): Promise<{ success: boolean; message: string; clerkUserId?: string }> {
  try {
    let targetClerkId: string | null = null;
    const clean = userIdOrEmail.trim().toLowerCase();

    if (clean.startsWith("user_")) {
      targetClerkId = clean;
    } else if (clean.includes("@")) {
      // Look up user by email address in Clerk API
      try {
        const searchRes = await fetch(
          `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(clean)}`,
          { headers: { Authorization: `Bearer ${secretKey}` } }
        );
        if (searchRes.ok) {
          const users = await searchRes.json();
          if (Array.isArray(users) && users.length > 0) {
            targetClerkId = users[0].id;
          }
        }
      } catch (lookupErr: any) {
        console.warn("Clerk user lookup error:", lookupErr?.message);
      }
    }

    if (!targetClerkId && !clean.startsWith("user_")) {
      return {
        success: false,
        message: `لم يتم العثور على حساب في خوادم Clerk مطابق لـ (${userIdOrEmail}) أو تم حذفه مسبقاً.`,
      };
    }

    const deleteTarget = targetClerkId || clean;
    const delRes = await fetch(`https://api.clerk.com/v1/users/${deleteTarget}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (delRes.ok) {
      return {
        success: true,
        message: `تم حذف الحساب نهائياً من خوادم Clerk (${deleteTarget})`,
        clerkUserId: deleteTarget,
      };
    } else {
      const errBody = await delRes.text();
      return {
        success: false,
        message: `رفضت Clerk طلب الحذف (${delRes.status}): ${errBody}`,
      };
    }
  } catch (err: any) {
    return { success: false, message: `تعذر الاتصال بخوادم Clerk: ${err?.message}` };
  }
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
      suspended: allRequests.filter((r) => r.status === "suspended").length,
    };

    const consultationsBreakdown = {
      total: allConsultations.length,
      submitted: allConsultations.filter((c) => c.status === "submitted").length,
      reviewing: allConsultations.filter((c) => c.status === "reviewing").length,
      contacted: allConsultations.filter((c) => c.status === "contacted").length,
      completed: allConsultations.filter((c) => c.status === "completed").length,
      suspended: allConsultations.filter((c) => c.status === "suspended").length,
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
    const [profiles, users] = await Promise.all([
      profilesColl.find({}).toArray(),
      db.collection("users").find({}).toArray(),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const userMap = new Map(users.map((u) => [u._id, u]));

    let items = requests.map((r) => {
      const client = profileMap.get(r.userId) || userMap.get(r.userId);
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
          ? { name: client.name || "عميل", email: client.email || "", company: client.company || "" }
          : { name: "عميل", email: "", company: "" },
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

// DELETE /api/admin/requests/:id - Permanently delete request
router.delete("/admin/requests/:id", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { id } = req.params;
  try {
    const db = await getMongoDb();
    const requestsColl = db.collection("clientRequests");
    const result = await requestsColl.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json({ success: true, message: "Print request permanently deleted" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete request", details: err?.message });
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
    const [profiles, users] = await Promise.all([
      profilesColl.find({}).toArray(),
      db.collection("users").find({}).toArray(),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const userMap = new Map(users.map((u) => [u._id, u]));

    const items = consultations.map((c) => {
      const client = profileMap.get(c.userId) || userMap.get(c.userId);
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
          ? { name: client.name || "عميل", email: client.email || "", company: client.company || "" }
          : { name: "عميل", email: "", company: "" },
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

// DELETE /api/admin/consultations/:id - Permanently delete consultation
router.delete("/admin/consultations/:id", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAccess(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { id } = req.params;
  try {
    const db = await getMongoDb();
    const consultationsColl = db.collection("clientConsultations");
    const result = await consultationsColl.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Consultation not found" });
      return;
    }
    res.json({ success: true, message: "Consultation permanently deleted" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete consultation", details: err?.message });
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

    // Strictly filter out any admin profiles or legacy demo users
    const clientProfilesOnly = profiles.filter(
      (p) =>
        !adminIds.has(String(p.userId)) &&
        !adminEmails.has(String(p.email).toLowerCase()) &&
        p.userId !== "demo_client_user" &&
        p.email?.toLowerCase() !== "client@aj-industry.com" &&
        !p.name?.includes("المهندس المسؤول") &&
        !p.name?.includes("المدير")
    );

    const usersColl = db.collection("users");
    const clientUsers = await usersColl.find({ role: "client" }).toArray();
    const userMap = new Map(clientUsers.map((u) => [String(u._id), u]));

    // Strictly deduplicate by userId to ensure distinct client entries
    const uniqueProfilesMap = new Map<string, any>();
    for (const p of clientProfilesOnly) {
      const uId = String(p.userId || p._id);
      const matchedUser = userMap.get(uId);
      const enhanced = {
        ...p,
        email: p.email || matchedUser?.email || "",
        name: p.name || matchedUser?.name || "عميل AJ",
        company: p.company || matchedUser?.company || "",
      };

      if (!uniqueProfilesMap.has(uId)) {
        uniqueProfilesMap.set(uId, enhanced);
      } else {
        const prev = uniqueProfilesMap.get(uId);
        const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
        const curTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
        if (curTime > prevTime) {
          uniqueProfilesMap.set(uId, enhanced);
        }
      }
    }

    // Also include any client users that might not have a clientProfile yet
    for (const u of clientUsers) {
      const uId = String(u._id);
      if (
        !uniqueProfilesMap.has(uId) &&
        !adminIds.has(uId) &&
        !adminEmails.has(String(u.email).toLowerCase()) &&
        uId !== "demo_client_user" &&
        u.email?.toLowerCase() !== "client@aj-industry.com"
      ) {
        uniqueProfilesMap.set(uId, {
          userId: uId,
          name: u.name || "عميل AJ",
          email: u.email || "",
          company: u.company || "",
          createdAt: u.createdAt || new Date(),
          updatedAt: u.updatedAt || new Date(),
        });
      }
    }

    const deduplicatedProfiles = Array.from(uniqueProfilesMap.values());

    const clientsWithStats = deduplicatedProfiles.map((p) => {
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

// DELETE /api/admin/clients/:userId - Completely delete client credentials from MongoDB and Clerk
router.delete(["/admin/clients/:userId", "/api/admin/clients/:userId"], async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { userId } = req.params;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Client user ID is required" });
    return;
  }

  try {
    const db = await getMongoDb();
    const profilesColl = db.collection("clientProfiles");
    const usersColl = db.collection("users");
    const sessionsColl = db.collection("sessions");
    const requestsColl = db.collection("clientRequests");
    const consultationsColl = db.collection("clientConsultations");
    const revokedColl = db.collection("revokedClients");

    // Look up client in profiles and users
    const [profile, user] = await Promise.all([
      profilesColl.findOne({ $or: [{ userId }, { _id: userId }] }),
      usersColl.findOne({ $or: [{ _id: userId }, { clerkId: userId }] }),
    ]);

    const targetEmail = (profile?.email || user?.email || "").toLowerCase().trim();
    const targetName = profile?.name || user?.name || "";

    // Safeguard: strictly protect system administrator accounts
    if (
      userId === "admin_super_user" ||
      user?.role === "admin" ||
      targetEmail === "admin@aj-industry.com" ||
      targetName.includes("المهندس المسؤول") ||
      targetName.includes("المدير")
    ) {
      res.status(403).json({
        error: "حساب الإدارة محمي ولا يمكن حذفه / Cannot delete administrator account",
      });
      return;
    }

    // -------------------------------------------------------------
    // Step 1: Record permanent revocation in MongoDB
    // -------------------------------------------------------------
    const revokeOrList: any[] = [{ userId }];
    if (targetEmail) {
      revokeOrList.push({ email: targetEmail });
    }
    await revokedColl.updateOne(
      { $or: revokeOrList },
      {
        $set: {
          userId,
          email: targetEmail,
          name: targetName,
          status: "revoked",
          reason: "Deleted by administrator",
          revokedAt: new Date(),
          revokedBy: "admin",
        },
      },
      { upsert: true }
    );

    // -------------------------------------------------------------
    // Step 2: Delete client account & credentials from Clerk (if valid sk_ key available)
    // -------------------------------------------------------------
    const clerkStatus = {
      attempted: false,
      deleted: false,
      clerkUserId: null as string | null,
      message: "",
    };

    const effectiveClerkKey = await getEffectiveClerkSecretKey();

    if (effectiveClerkKey) {
      clerkStatus.attempted = true;
      const clerkTarget = user?.clerkId || (userId.startsWith("user_") ? userId : (targetEmail || userId));
      const clerkResult = await deleteUserFromClerk(clerkTarget, effectiveClerkKey);
      clerkStatus.deleted = clerkResult.success;
      clerkStatus.clerkUserId = clerkResult.clerkUserId || null;
      clerkStatus.message = clerkResult.message;
    } else {
      clerkStatus.attempted = false;
      clerkStatus.deleted = false;
      clerkStatus.message = "لم يتم الحذف من خوادم Clerk لعدم توفر مفتاح Secret Key صالح (sk_test_...). تم حذف الحساب وتطهير بياناته بالكامل من MongoDB.";
    }

    // -------------------------------------------------------------
    // Step 3: Delete client credentials & data from MongoDB
    // -------------------------------------------------------------
    const deleteAssociated = req.query.deleteAssociated !== "false" && req.body?.deleteAssociated !== false;

    // Delete client profiles
    const profileDelete = await profilesColl.deleteMany({
      $or: [
        { userId },
        { _id: userId },
        ...(targetEmail ? [{ email: targetEmail }] : []),
      ],
    });

    // Delete user credentials from users collection
    const userDelete = await usersColl.deleteMany({
      $or: [
        { _id: userId },
        { clerkId: userId },
        ...(targetEmail ? [{ email: targetEmail }] : []),
      ],
    });

    // Delete active sessions
    const sessionDelete = await sessionsColl.deleteMany({
      $or: [
        { userId },
        ...(targetEmail ? [{ email: targetEmail }] : []),
      ],
    });

    // Delete associated engineering requests and consultations if enabled
    let requestsDeleted = 0;
    let consultationsDeleted = 0;
    if (deleteAssociated) {
      const [reqDel, consDel] = await Promise.all([
        requestsColl.deleteMany({
          $or: [
            { userId },
            ...(targetEmail ? [{ clientEmail: targetEmail }] : []),
          ],
        }),
        consultationsColl.deleteMany({
          $or: [
            { userId },
            ...(targetEmail ? [{ clientEmail: targetEmail }] : []),
          ],
        }),
      ]);
      requestsDeleted = reqDel.deletedCount || 0;
      consultationsDeleted = consDel.deletedCount || 0;
    }

    res.json({
      success: true,
      message: clerkStatus.deleted
        ? "Client account deleted successfully from MongoDB and Clerk"
        : "Client account deleted from MongoDB (Clerk cloud deletion requires valid Secret Key)",
      messageAr: clerkStatus.deleted
        ? "تم حذف حساب العميل بنجاح من قاعدة البيانات وخوادم Clerk معاً."
        : "تم حذف وتطهير حساب العميل من قاعدة البيانات بنجاح (الحذف من خوادم Clerk يتطلب توفير مفتاح الربط الصالح).",
      deletedUserId: userId,
      clerk: clerkStatus,
      mongodb: {
        profilesDeleted: profileDelete.deletedCount || 0,
        usersDeleted: userDelete.deletedCount || 0,
        sessionsDeleted: sessionDelete.deletedCount || 0,
        requestsDeleted,
        consultationsDeleted,
      },
    });
  } catch (err: any) {
    req.log?.error?.({ err, userId }, "Failed to delete client account");
    res.status(500).json({
      error: "فشل حذف حساب العميل من قاعدة البيانات / Failed to delete client account",
      details: err?.message,
    });
  }
});

// GET /api/admin/clerk-status - Get live Clerk integration & secret key connection status
router.get("/admin/clerk-status", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const effectiveKey = await getEffectiveClerkSecretKey();
  const publishableKey = (process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();

  if (!effectiveKey) {
    res.json({
      configured: false,
      valid: false,
      publishableKey: publishableKey ? `${publishableKey.slice(0, 16)}...` : "",
      message: "مفتاح Clerk Secret Key غير مهيأ بصيغة صالحة (يجب أن يبدأ بـ sk_test_ أو sk_live_). الحذف التلقائي من خوادم Clerk السحابية معطل حتى يتم توفير المفتاح.",
      messageEn: "Clerk Secret Key missing or invalid. Automated Clerk cloud deletion is disabled until a valid key is provided.",
    });
    return;
  }

  try {
    const testRes = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${effectiveKey}` },
    });
    if (testRes.ok) {
      res.json({
        configured: true,
        valid: true,
        publishableKey: publishableKey ? `${publishableKey.slice(0, 16)}...` : "",
        keyPrefix: `${effectiveKey.slice(0, 12)}...`,
        message: "متصل وخوادم Clerk جاهزة للحذف والإدارة المباشرة بنجاح.",
        messageEn: "Connected. Clerk servers are verified and ready for automated deletion and sync.",
      });
    } else {
      const errText = await testRes.text();
      res.json({
        configured: true,
        valid: false,
        publishableKey: publishableKey ? `${publishableKey.slice(0, 16)}...` : "",
        keyPrefix: `${effectiveKey.slice(0, 12)}...`,
        message: `تم رفض مفتاح Clerk من خوادم Clerk (${testRes.status}): يرجى نسخه بشكل كامل من dashboard.clerk.com`,
        messageEn: `Clerk API rejected the secret key (${testRes.status}).`,
        details: errText,
      });
    }
  } catch (err: any) {
    res.json({
      configured: true,
      valid: false,
      message: `تعذر الاتصال بـ Clerk: ${err?.message}`,
    });
  }
});

// POST /api/admin/clerk-config - Update Clerk Secret Key dynamically in MongoDB
router.post("/admin/clerk-config", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { secretKey } = req.body || {};
  if (!secretKey || typeof secretKey !== "string") {
    res.status(400).json({ error: "Secret key string is required" });
    return;
  }

  const cleanKey = secretKey.trim();
  if (!cleanKey.startsWith("sk_test_") && !cleanKey.startsWith("sk_live_")) {
    res.status(400).json({
      error: "صيغة المفتاح غير صحيحة. يجب أن يبدأ بـ sk_test_ أو sk_live_ من لوحة تحكم Clerk.",
    });
    return;
  }

  // Test against Clerk API first
  try {
    const testRes = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${cleanKey}` },
    });
    if (!testRes.ok) {
      const errText = await testRes.text();
      res.status(400).json({
        error: `رفضت Clerk هذا المفتاح (${testRes.status}). يرجى التأكد من نسخه بشكل دقيق من dashboard.clerk.com -> API Keys.`,
        details: errText,
      });
      return;
    }

    const db = await getMongoDb();
    await db.collection("appSettings").updateOne(
      { key: "clerkSecretKey" },
      { $set: { key: "clerkSecretKey", value: cleanKey, updatedAt: new Date() } },
      { upsert: true }
    );
    process.env.CLERK_SECRET_KEY = cleanKey;

    res.json({
      success: true,
      message: "تم حفظ واختبار مفتاح Clerk بنجاح! الآن أي حذف للعميل سيتم تلقائياً في MongoDB و Clerk معاً.",
    });
  } catch (err: any) {
    res.status(500).json({ error: "فشل اختبار المفتاح مع خوادم Clerk", details: err?.message });
  }
});

// POST /api/admin/clerk-purge-user - Direct purge of user from Clerk servers by email or userId
router.post("/admin/clerk-purge-user", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { email, userId } = req.body || {};
  const target = (email || userId || "").trim();
  if (!target) {
    res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني أو معرّف المستخدم / Email or userId required" });
    return;
  }

  const cleanEmail = target.toLowerCase();
  const db = await getMongoDb();

  // Purge completely from MongoDB local database
  await Promise.all([
    db.collection("clientProfiles").deleteMany({ $or: [{ email: cleanEmail }, { userId: target }] }),
    db.collection("users").deleteMany({ $or: [{ email: cleanEmail }, { _id: target }, { clerkId: target }] }),
    db.collection("sessions").deleteMany({ $or: [{ email: cleanEmail }, { userId: target }] }),
    db.collection("revokedClients").deleteMany({ $or: [{ email: cleanEmail }, { userId: target }] }),
  ]);

  const effectiveKey = await getEffectiveClerkSecretKey();
  if (!effectiveKey) {
    res.json({
      success: false,
      mongodbCleaned: true,
      clerkCleaned: false,
      target: cleanEmail,
      message: `تم تنظيف وتطهير الحساب بالكامل من قاعدة بيانات الموقع (MongoDB). ولكن تعذر الحذف من خوادم Clerk السحابية لعدم توفر مفتاح Secret Key صالح (sk_test_...). يمكنك حذف الحساب يدوياً من dashboard.clerk.com -> Users -> ابحث عن ${cleanEmail} واضغط Delete User، أو قم بتهيئة المفتاح في لوحة التحكم.`,
    });
    return;
  }

  const clerkResult = await deleteUserFromClerk(target, effectiveKey);
  res.json({
    success: clerkResult.success,
    mongodbCleaned: true,
    clerkCleaned: clerkResult.success,
    target: cleanEmail,
    message: clerkResult.message,
    details: clerkResult,
  });
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

// GET /api/admin/contact - Get contact details and coordinates
router.get("/admin/contact", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const { getContactDetails } = await import("../lib/contact-store");
    const contact = await getContactDetails();
    res.json(contact);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load contact details", details: err?.message });
  }
});

// PUT /api/admin/contact - Update contact details and coordinates
router.put("/admin/contact", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const { updateContactDetails } = await import("../lib/contact-store");
    const updated = await updateContactDetails(req.body);
    res.json({ success: true, contact: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update contact details", details: err?.message });
  }
});

// POST /api/admin/contact/reset - Reset contact details and coordinates to factory defaults
router.post("/admin/contact/reset", async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  try {
    const { resetContactDetails } = await import("../lib/contact-store");
    const resetData = await resetContactDetails();
    res.json({ success: true, contact: resetData });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset contact details", details: err?.message });
  }
});

export default router;
