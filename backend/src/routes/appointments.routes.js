import { Router } from "express";
import {
  createAppointmentController,
  getAppointmentByIdController,
  listAppointmentsController,
  updateStatusController,
} from "../controllers/appointments.controller.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();

router.get("/", asyncHandler(listAppointmentsController));
router.get("/:id", asyncHandler(getAppointmentByIdController));
router.post("/", asyncHandler(createAppointmentController));
router.patch("/:id/status", asyncHandler(updateStatusController));

export default router;
