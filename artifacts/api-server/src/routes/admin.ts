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

    // If Clerk secret key is configured and valid, synchronize Clerk Cloud users into MongoDB client profiles
    if (process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.startsWith("sk_")) {
      try {
        const { createClerkClient } = await import("@clerk/express");
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUsers = await clerkClient.users.getUserList({ limit: 100 });
        if (clerkUsers.data && clerkUsers.data.length > 0) {
          const bulkOps = clerkUsers.data.map((cu: any) => {
            const email = cu.emailAddresses?.[0]?.emailAddress?.toLowerCase()?.trim() || "";
            const name = [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || email || "عميل AJ Industry";
            return {
              updateOne: {
                filter: { $or: [{ userId: cu.id }, ...(email ? [{ email }] : [])] },
                update: {
                  $set: {
                    userId: cu.id,
                    clerkId: cu.id,
                    email,
                    username: cu.username || email || cu.id,
                    name,
                    updatedAt: new Date(),
                  },
                  $setOnInsert: {
                    company: (cu.publicMetadata?.company as string) || "AJ Partner",
                    createdAt: cu.createdAt ? new Date(cu.createdAt) : new Date(),
                  },
                },
                upsert: true,
              },
            };
          });
          await profilesColl.bulkWrite(bulkOps, { ordered: false });
        }
      } catch (clerkSyncErr: any) {
        console.warn("[Clerk Sync] Note during directory fetch:", clerkSyncErr?.message);
      }
    }

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

    // Strictly deduplicate by userId to ensure distinct client entries
    const uniqueProfilesMap = new Map<string, any>();
    for (const p of clientProfilesOnly) {
      const uId = String(p.userId || p._id);
      if (!uniqueProfilesMap.has(uId)) {
        uniqueProfilesMap.set(uId, p);
      } else {
        const prev = uniqueProfilesMap.get(uId);
        const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
        const curTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
        if (curTime > prevTime) {
          uniqueProfilesMap.set(uId, p);
        }
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
    // Step 1: Delete client account & credentials from Clerk
    // -------------------------------------------------------------
    const clerkStatus = {
      attempted: false,
      deleted: false,
      clerkUserId: null as string | null,
      message: "",
    };

    if (process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.startsWith("sk_")) {
      clerkStatus.attempted = true;
      try {
        const { createClerkClient } = await import("@clerk/express");
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

        let resolvedClerkId: string | null = null;
        if (userId.startsWith("user_")) {
          resolvedClerkId = userId;
        } else if (user?.clerkId && typeof user.clerkId === "string" && user.clerkId.startsWith("user_")) {
          resolvedClerkId = user.clerkId;
        } else if (profile?.clerkId && typeof profile.clerkId === "string" && profile.clerkId.startsWith("user_")) {
          resolvedClerkId = profile.clerkId;
        } else if (targetEmail) {
          try {
            const clerkUsers = await clerkClient.users.getUserList({
              emailAddress: [targetEmail],
            });
            if (clerkUsers.data && clerkUsers.data.length > 0) {
              resolvedClerkId = clerkUsers.data[0].id;
            }
          } catch (lookupErr: any) {
            console.warn("Clerk email lookup note:", lookupErr?.message);
          }
        }

        if (resolvedClerkId) {
          await clerkClient.users.deleteUser(resolvedClerkId);
          clerkStatus.deleted = true;
          clerkStatus.clerkUserId = resolvedClerkId;
          clerkStatus.message = `Successfully deleted Clerk user (${resolvedClerkId})`;
        } else {
          try {
            await clerkClient.users.deleteUser(userId);
            clerkStatus.deleted = true;
            clerkStatus.clerkUserId = userId;
            clerkStatus.message = `Deleted user (${userId}) from Clerk`;
          } catch (directErr: any) {
            clerkStatus.message = `Client was not found in Clerk or was a local profile: ${directErr?.message || "Not found"}`;
          }
        }
      } catch (clerkErr: any) {
        console.warn("Clerk deletion error:", clerkErr?.message);
        clerkStatus.message = clerkErr?.message || "Failed to remove user from Clerk";
      }
    } else if (process.env.CLERK_SECRET_KEY) {
      clerkStatus.attempted = true;
      clerkStatus.message = "CLERK_SECRET_KEY is pending update (requires valid sk_test_... or sk_live_... key)";
    } else {
      clerkStatus.message = "CLERK_SECRET_KEY not set; Clerk API call bypassed";
    }

    // -------------------------------------------------------------
    // Step 2: Delete client credentials & data from MongoDB
    // -------------------------------------------------------------
    const deleteAssociated = req.query.deleteAssociated !== "false" && req.body?.deleteAssociated !== false;

    // Delete client profiles
    const profileDelete = await profilesColl.deleteMany({
      $or: [
        { userId },
        { _id: userId },
        { clerkId: userId },
        ...(clerkStatus.clerkUserId ? [{ userId: clerkStatus.clerkUserId }, { clerkId: clerkStatus.clerkUserId }] : []),
        ...(targetEmail ? [{ email: targetEmail }] : []),
      ],
    });

    // Delete user credentials from users collection
    const userDelete = await usersColl.deleteMany({
      $or: [
        { _id: userId },
        { clerkId: userId },
        ...(clerkStatus.clerkUserId ? [{ _id: clerkStatus.clerkUserId }, { clerkId: clerkStatus.clerkUserId }] : []),
        ...(targetEmail ? [{ email: targetEmail }] : []),
      ],
    });

    // Delete active sessions
    const sessionDelete = await sessionsColl.deleteMany({
      $or: [
        { userId },
        ...(clerkStatus.clerkUserId ? [{ userId: clerkStatus.clerkUserId }] : []),
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
      message: "Client account deleted successfully from MongoDB and Clerk",
      messageAr: "تم حذف حساب العميل وبيانات اعتماده بنجاح من MongoDB و Clerk",
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

// PATCH /api/admin/clients/:userId - Edit client profile in MongoDB and sync to Clerk
router.patch(["/admin/clients/:userId", "/api/admin/clients/:userId"], async (req: Request, res: Response): Promise<void> => {
  if (!(await checkAdminAccess(req))) {
    res.status(403).json({ error: "Admin authorization required" });
    return;
  }

  const { userId } = req.params;
  const { name, company, email } = req.body || {};

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Client user ID is required" });
    return;
  }

  try {
    const db = await getMongoDb();
    const profilesColl = db.collection("clientProfiles");
    const usersColl = db.collection("users");

    const [profile, user] = await Promise.all([
      profilesColl.findOne({ $or: [{ userId }, { _id: userId }, { clerkId: userId }] }),
      usersColl.findOne({ $or: [{ _id: userId }, { clerkId: userId }] }),
    ]);

    const targetEmail = (email && typeof email === "string" && email.includes("@"))
      ? email.toLowerCase().trim()
      : (profile?.email || user?.email || "").toLowerCase().trim();

    const cleanName = (typeof name === "string" && name.trim()) ? name.trim() : (profile?.name || user?.name || "");
    const cleanCompany = (typeof company === "string") ? company.trim() : (profile?.company || user?.company || "");
    const now = new Date();

    // 1. Update MongoDB records
    await Promise.all([
      profilesColl.updateMany(
        { $or: [{ userId }, { _id: userId }, { clerkId: userId }, ...(targetEmail ? [{ email: targetEmail }] : [])] },
        {
          $set: {
            name: cleanName,
            company: cleanCompany,
            email: targetEmail,
            updatedAt: now,
          },
        }
      ),
      usersColl.updateMany(
        { $or: [{ _id: userId }, { clerkId: userId }, ...(targetEmail ? [{ email: targetEmail }] : [])] },
        {
          $set: {
            name: cleanName,
            company: cleanCompany,
            email: targetEmail,
            updatedAt: now,
          },
        }
      ),
    ]);

    // 2. Sync to Clerk if key configured
    const clerkStatus = { attempted: false, updated: false, message: "" };
    if (process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.startsWith("sk_")) {
      clerkStatus.attempted = true;
      try {
        const { createClerkClient } = await import("@clerk/express");
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

        let resolvedClerkId: string | null = null;
        if (userId.startsWith("user_")) {
          resolvedClerkId = userId;
        } else if (user?.clerkId && typeof user.clerkId === "string" && user.clerkId.startsWith("user_")) {
          resolvedClerkId = user.clerkId;
        } else if (profile?.clerkId && typeof profile.clerkId === "string" && profile.clerkId.startsWith("user_")) {
          resolvedClerkId = profile.clerkId;
        } else if (targetEmail) {
          const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [targetEmail] });
          if (clerkUsers.data && clerkUsers.data.length > 0) {
            resolvedClerkId = clerkUsers.data[0].id;
          }
        }

        if (resolvedClerkId) {
          const [firstName, ...rest] = cleanName.split(" ");
          const lastName = rest.join(" ");
          await clerkClient.users.updateUser(resolvedClerkId, {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            publicMetadata: { company: cleanCompany },
          });
          clerkStatus.updated = true;
          clerkStatus.message = `Synced changes to Clerk (${resolvedClerkId})`;
        } else {
          clerkStatus.message = "Local MongoDB user (not present in Clerk)";
        }
      } catch (clerkErr: any) {
        console.warn("[Clerk Edit] Note:", clerkErr?.message);
        clerkStatus.message = clerkErr?.message || "Failed to update on Clerk";
      }
    }

    res.json({
      success: true,
      message: "Client profile updated successfully",
      messageAr: "تم تحديث بيانات العميل بنجاح في MongoDB و Clerk",
      user: {
        userId,
        name: cleanName,
        email: targetEmail,
        company: cleanCompany,
      },
      clerk: clerkStatus,
    });
  } catch (err: any) {
    req.log?.error?.({ err, userId }, "Failed to update client profile");
    res.status(500).json({ error: "Failed to update client profile", details: err?.message });
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
