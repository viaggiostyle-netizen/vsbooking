import { Router } from "express";
import { getDashboardMetricsController } from "../controllers/dashboard.controller.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();

router.get("/metrics", asyncHandler(getDashboardMetricsController));

export default router;
