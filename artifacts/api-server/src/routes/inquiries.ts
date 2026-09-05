import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CreateInquiryBody,
  CreateInquiryResponse,
} from "@workspace/api-zod";
import { getMongoDb } from "../lib/mongo";

const router: IRouter = Router();

router.post("/inquiries", async (req, res): Promise<void> => {
  const parsed = CreateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const reference = `AJ-${randomUUID().slice(0, 8).toUpperCase()}`;
  try {
    const db = await getMongoDb();
    await db.collection("inquiries").insertOne({
      reference,
      ...parsed.data,
      createdAt: new Date(),
    });

    req.log.info(
      { reference, serviceSlug: parsed.data.serviceSlug, hasCompany: Boolean(parsed.data.company) },
      "Public inquiry persisted",
    );

    res.status(201).json(
      CreateInquiryResponse.parse({
        reference,
        messageAr: "تم استلام طلبك. سيتواصل معك فريقنا الهندسي قريباً.",
        messageEn: "Your inquiry has been received. Our engineering team will follow up shortly.",
      }),
    );
  } catch (error) {
    req.log.error({ err: error, reference }, "Unable to persist public inquiry");
    res.status(503).json({ error: "Inquiry service is temporarily unavailable" });
  }
});

export default router;