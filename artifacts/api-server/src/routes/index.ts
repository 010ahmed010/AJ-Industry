import { Router, type IRouter } from "express";
import healthRouter from "./health";
import siteRouter from "./site";
import estimatorRouter from "./estimator";
import inquiriesRouter from "./inquiries";
import clientRouter from "./client";

const router: IRouter = Router();

router.use(healthRouter);
router.use(siteRouter);
router.use(estimatorRouter);
router.use(inquiriesRouter);
router.use(clientRouter);

export default router;
