import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import {
  CreateClientPrintRequestBody,
  CreateClientPrintRequestResponse,
  GetClientOverviewResponse,
  GetClientProfileResponse,
  UpdateClientProfileBody,
  UpdateClientProfileResponse,
} from "@workspace/api-zod";
import { getMongoDb } from "../lib/mongo";

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
  status: "submitted" | "reviewing" | "quoted" | "scheduled" | "completed";
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

function authenticatedUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

async function loadOrCreateProfile(userId: string): Promise<ClientProfileRecord> {
  const db = await getMongoDb();
  const profiles = db.collection<ClientProfileRecord>("clientProfiles");
  const existing = await profiles.findOne({ userId });
  const user = await clerkClient.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const username = user.username ?? email;
  const name =
    existing?.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    username;
  const profile: ClientProfileRecord = {
    userId,
    username,
    email,
    name,
    company: existing?.company ?? "",
    createdAt: existing?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  await profiles.updateOne(
    { userId },
    { $set: profile, $setOnInsert: { createdAt: profile.createdAt } },
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

function publicRequest(request: ClientRequestRecord) {
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
    createdAt: request.createdAt,
  };
}

router.get("/client/profile", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
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
  const userId = authenticatedUserId(req, res);
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
  const userId = authenticatedUserId(req, res);
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
    res.json(
      GetClientOverviewResponse.parse({
        profile: publicProfile(profile),
        requests: requests.map(publicRequest),
      }),
    );
  } catch (error) {
    req.log.error({ err: error, userId }, "Unable to load client overview");
    res.status(503).json({ error: "Client overview service is temporarily unavailable" });
  }
});

router.post("/client/print-requests", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req, res);
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

export default router;