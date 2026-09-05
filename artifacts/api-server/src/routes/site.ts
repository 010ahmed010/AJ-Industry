import { Router, type IRouter } from "express";
import {
  GetHomeContentResponse,
  GetServiceParams,
  GetServiceResponse,
  ListMaterialsResponse,
  ListServicesResponse,
} from "@workspace/api-zod";
import { homeContent, materials, services } from "../lib/site-content";

const router: IRouter = Router();

router.get("/site/home", (_req, res): void => {
  res.json(GetHomeContentResponse.parse(homeContent));
});

router.get("/services", (_req, res): void => {
  res.json(ListServicesResponse.parse(services));
});

router.get("/services/:slug", (req, res): void => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const service = services.find((item) => item.slug === params.data.slug);
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(GetServiceResponse.parse(service));
});

router.get("/materials", (_req, res): void => {
  res.json(ListMaterialsResponse.parse(materials));
});

export default router;