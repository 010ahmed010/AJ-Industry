import { Router, type IRouter } from "express";
import {
  GetHomeContentResponse,
  GetServiceParams,
  GetServiceResponse,
  ListMaterialsResponse,
  ListServicesResponse,
} from "@workspace/api-zod";
import { homeContent, materials } from "../lib/site-content";
import { getAllServices, getServiceBySlug } from "../lib/services-store";

const router: IRouter = Router();

router.get("/site/home", (_req, res): void => {
  res.json(GetHomeContentResponse.parse(homeContent));
});

router.get("/services", async (_req, res): Promise<void> => {
  try {
    const list = await getAllServices();
    res.json(ListServicesResponse.parse(list));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load services", details: err?.message });
  }
});

router.get("/services/:slug", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const service = await getServiceBySlug(params.data.slug);
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.json(GetServiceResponse.parse(service));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load service", details: err?.message });
  }
});

router.get("/materials", (_req, res): void => {
  res.json(ListMaterialsResponse.parse(materials));
});

export default router;