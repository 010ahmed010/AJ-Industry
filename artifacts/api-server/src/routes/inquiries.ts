import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CreateInquiryBody,
  CreateInquiryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/inquiries", (req, res): void => {
  const parsed = CreateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  req.log.info(
    { serviceSlug: parsed.data.serviceSlug, hasCompany: Boolean(parsed.data.company) },
    "Public inquiry received",
  );

  const reference = `AJ-${randomUUID().slice(0, 8).toUpperCase()}`;
  res.status(201).json(
    CreateInquiryResponse.parse({
      reference,
      messageAr: "تم استلام طلبك. سيتواصل معك فريقنا الهندسي قريباً.",
      messageEn: "Your inquiry has been received. Our engineering team will follow up shortly.",
    }),
  );
});

export default router;