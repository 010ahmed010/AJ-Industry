import { Router, type IRouter } from "express";
import {
  CreatePrintEstimateBody,
  CreatePrintEstimateResponse,
} from "@workspace/api-zod";
import { materials } from "../lib/site-content";

const router: IRouter = Router();

router.post("/print-estimates", (req, res): void => {
  const parsed = CreatePrintEstimateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const material = materials.find((item) => item.id === parsed.data.materialId);
  if (!material) {
    res.status(400).json({ error: "Unsupported material" });
    return;
  }

  const estimatedCost = Number(
    Math.max(18, parsed.data.weightGrams * parsed.data.quantity * material.pricePerGram + 12).toFixed(2),
  );
  const estimatedLeadDays = material.leadDays + Math.ceil(parsed.data.quantity / 4);
  const result = {
    materialId: material.id,
    quantity: parsed.data.quantity,
    weightGrams: parsed.data.weightGrams,
    estimatedCost,
    estimatedLeadDays,
    currency: "USD",
    noteAr: "تقدير مبدئي قابل للتعديل بعد فحص الملف والخامة المطلوبة.",
    noteEn: "A preliminary estimate that may change after file and material review.",
  };

  res.json(CreatePrintEstimateResponse.parse(result));
});

export default router;