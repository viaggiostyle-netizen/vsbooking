import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { query, withTransaction } from "../config/db.js";
import {
  APPOINTMENT_STATUS,
  RESOLVED_STATUSES,
  STATUS_TRANSITIONS,
} from "../constants/appointment-status.js";
import {
  findOrCreateClient,
  getClientById,
  incrementClientCompleted,
} from "./client.service.js";
import { AppError } from "../utils/errors.js";

dayjs.extend(customParseFormat);

function assertDate(date) {
  const value = String(date ?? "").trim();
  if (!dayjs(value, "YYYY-MM-DD", true).isValid()) {
    throw new AppError("La fecha debe tener formato YYYY-MM-DD.", 400, "VALIDATION_ERROR");
  }
  return value;
}

function assertTime(time) {
  const value = String(time ?? "").trim();
  if (!dayjs(value, ["HH:mm", "HH:mm:ss"], true).isValid()) {
    throw new AppError("La hora debe tener formato HH:mm o HH:mm:ss.", 400, "VALIDATION_ERROR");
  }
  return value.length === 5 ? `${value}:00` : value;
}

function assertTargetStatus(status) {
  const value = String(status ?? "").trim().toUpperCase();
  if (!Object.values(APPOINTMENT_STATUS).includes(value)) {
    throw new AppError("Estado de turno invalido.", 400, "VALIDATION_ERROR");
  }
  return value;
}

async function loadService(trx, serviceId) {
  const result = await trx.query(
    `
      select id, name, price, duration
      from services
      where id = $1
      limit 1
    `,
    [serviceId]
  );

  const service = result.rows[0];
  if (!service) {
    throw new AppError("Servicio no encontrado.", 404, "SERVICE_NOT_FOUND");
  }
  return service;
}

async function ensureSlotAvailable(trx, date, time) {
  const result = await trx.query(
    `
      select id
      from appointments
      where date = $1
        and time = $2
        and status <> $3
      limit 1
      for update
    `,
    [date, time, APPOINTMENT_STATUS.CANCELADO]
  );

  if (result.rows[0]) {
    throw new AppError("El horario seleccionado no esta disponible.", 409, "SLOT_UNAVAILABLE");
  }
}

async function hydrateAppointment(trx, appointmentId) {
  const result = await trx.query(
    `
      select
        a.id,
        a.client_id,
        c.name as client_name,
        c.phone as client_phone,
        c.total_completed as client_total_completed,
        c.is_recurrent as client_is_recurrent,
        a.service_id,
        s.name as service_name,
        s.duration as service_duration,
        a.date,
        to_char(a.time, 'HH24:MI:SS') as time,
        a.status,
        a.price_snapshot,
        a.created_at,
        a.updated_at
      from appointments a
      join clients c on c.id = a.client_id
      join services s on s.id = a.service_id
      where a.id = $1
      limit 1
    `,
    [appointmentId]
  );

  return result.rows[0] ?? null;
}

export async function createAppointment(payload) {
  const serviceId = String(payload?.service_id ?? "").trim();
  if (!serviceId) {
    throw new AppError("service_id es obligatorio.", 400, "VALIDATION_ERROR");
  }

  const date = assertDate(payload?.date);
  const time = assertTime(payload?.time);

  return withTransaction(async (trx) => {
    const service = await loadService(trx, serviceId);
    await ensureSlotAvailable(trx, date, time);

    let clientId = payload?.client_id ? String(payload.client_id).trim() : "";
    if (clientId) {
      const existingClient = await getClientById(trx, clientId);
      if (!existingClient) {
        throw new AppError("Cliente no encontrado.", 404, "CLIENT_NOT_FOUND");
      }
    } else {
      const client = await findOrCreateClient(trx, payload?.client ?? payload);
      clientId = client.id;
    }

    const inserted = await trx.query(
      `
        insert into appointments(
          client_id,
          service_id,
          date,
          time,
          status,
          price_snapshot
        )
        values ($1, $2, $3, $4, $5, $6)
        returning id
      `,
      [
        clientId,
        service.id,
        date,
        time,
        APPOINTMENT_STATUS.PENDIENTE,
        payload?.price_snapshot ?? service.price,
      ]
    );

    return hydrateAppointment(trx, inserted.rows[0].id);
  });
}

export async function getAppointmentById(appointmentId) {
  const result = await query(
    `
      select
        a.id,
        a.client_id,
        c.name as client_name,
        c.phone as client_phone,
        c.total_completed as client_total_completed,
        c.is_recurrent as client_is_recurrent,
        a.service_id,
        s.name as service_name,
        s.duration as service_duration,
        a.date,
        to_char(a.time, 'HH24:MI:SS') as time,
        a.status,
        a.price_snapshot,
        a.created_at,
        a.updated_at
      from appointments a
      join clients c on c.id = a.client_id
      join services s on s.id = a.service_id
      where a.id = $1
      limit 1
    `,
    [appointmentId]
  );

  return result.rows[0] ?? null;
}

export async function listAppointments(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.date) {
    values.push(assertDate(filters.date));
    conditions.push(`a.date = $${values.length}`);
  }

  if (filters.status) {
    const status = assertTargetStatus(filters.status);
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }

  const where = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

  const result = await query(
    `
      select
        a.id,
        a.client_id,
        c.name as client_name,
        c.phone as client_phone,
        a.service_id,
        s.name as service_name,
        s.duration as service_duration,
        a.date,
        to_char(a.time, 'HH24:MI:SS') as time,
        a.status,
        a.price_snapshot,
        a.created_at,
        a.updated_at
      from appointments a
      join clients c on c.id = a.client_id
      join services s on s.id = a.service_id
      ${where}
      order by a.date asc, a.time asc
    `,
    values
  );

  return result.rows;
}

export async function updateAppointmentStatus(appointmentId, targetStatusRaw) {
  const targetStatus = assertTargetStatus(targetStatusRaw);

  return withTransaction(async (trx) => {
    const currentResult = await trx.query(
      `
        select id, client_id, status, price_snapshot, date, time
        from appointments
        where id = $1
        limit 1
        for update
      `,
      [appointmentId]
    );

    const appointment = currentResult.rows[0];
    if (!appointment) {
      throw new AppError("Turno no encontrado.", 404, "APPOINTMENT_NOT_FOUND");
    }

    if (appointment.status === targetStatus) {
      throw new AppError(
        `El turno ya se encuentra en estado ${targetStatus}.`,
        409,
        "STATUS_ALREADY_SET"
      );
    }

    const allowed = STATUS_TRANSITIONS[appointment.status] ?? new Set();
    if (!allowed.has(targetStatus)) {
      throw new AppError(
        `Transicion invalida: ${appointment.status} -> ${targetStatus}.`,
        409,
        "INVALID_STATUS_TRANSITION",
        {
          from: appointment.status,
          to: targetStatus,
        }
      );
    }

    await trx.query(
      `
        update appointments
        set status = $2
        where id = $1
      `,
      [appointmentId, targetStatus]
    );

    if (targetStatus === APPOINTMENT_STATUS.COMPLETADO) {
      const revenueInsert = await trx.query(
        `
          insert into revenue_logs(appointment_id, client_id, amount, date)
          values ($1, $2, $3, now())
          on conflict (appointment_id) do nothing
          returning id
        `,
        [appointment.id, appointment.client_id, appointment.price_snapshot]
      );

      if (!revenueInsert.rows[0]) {
        throw new AppError(
          "El turno ya fue procesado como COMPLETADO.",
          409,
          "DOUBLE_PROCESSING_BLOCKED"
        );
      }

      await incrementClientCompleted(trx, appointment.client_id);
    }

    return hydrateAppointment(trx, appointment.id);
  });
}

export function isAppointmentResolved(status) {
  return RESOLVED_STATUSES.has(status);
}
