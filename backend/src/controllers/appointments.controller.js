import { z } from "zod";
import {
  createAppointment,
  getAppointmentById,
  listAppointments,
  updateAppointmentStatus,
} from "../services/appointments.service.js";
import { getDashboardMetrics } from "../services/dashboard.service.js";
import { AppError } from "../utils/errors.js";

const createAppointmentSchema = z.object({
  service_id: z.string().uuid(),
  date: z.string().min(10),
  time: z.string().min(5),
  price_snapshot: z.number().nonnegative().optional(),
  client_id: z.string().uuid().optional(),
  client: z
    .object({
      name: z.string().min(2),
      phone: z.string().min(6),
    })
    .optional(),
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
});

const statusUpdateSchema = z.object({
  status: z.string().min(1),
});

const listSchema = z.object({
  date: z.string().optional(),
  status: z.string().optional(),
});

export async function createAppointmentController(req, res) {
  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError("Payload invalido para crear turno.", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }

  const appointment = await createAppointment(parsed.data);
  const metrics = await getDashboardMetrics();

  res.status(201).json({
    ok: true,
    data: appointment,
    metrics,
  });
}

export async function listAppointmentsController(req, res) {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError("Parametros de busqueda invalidos.", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }

  const appointments = await listAppointments(parsed.data);
  res.json({
    ok: true,
    data: appointments,
  });
}

export async function getAppointmentByIdController(req, res) {
  const appointment = await getAppointmentById(req.params.id);
  if (!appointment) {
    throw new AppError("Turno no encontrado.", 404, "APPOINTMENT_NOT_FOUND");
  }

  res.json({
    ok: true,
    data: appointment,
  });
}

export async function updateStatusController(req, res) {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError("Payload invalido para cambiar estado.", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }

  const appointment = await updateAppointmentStatus(req.params.id, parsed.data.status);
  const metrics = await getDashboardMetrics();

  res.json({
    ok: true,
    data: appointment,
    metrics,
  });
}
