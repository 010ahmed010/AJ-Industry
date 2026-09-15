import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import siteRouter from "./site";
import estimatorRouter from "./estimator";
import inquiriesRouter from "./inquiries";
import clientRouter from "./client";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(siteRouter);
router.use(estimatorRouter);
router.use(inquiriesRouter);
router.use(clientRouter);
router.use(adminRouter);

export default router;
