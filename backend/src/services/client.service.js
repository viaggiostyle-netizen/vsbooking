import { AppError } from "../utils/errors.js";

export function normalizePhone(phone) {
  return String(phone ?? "")
    .trim()
    .replace(/\s+/g, "");
}

export function normalizeName(name) {
  return String(name ?? "").trim();
}

export async function findClientByPhone(db, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const result = await db.query(
    `
      select id, name, phone, total_completed, is_recurrent, created_at
      from clients
      where phone = $1
      limit 1
    `,
    [normalizedPhone]
  );

  return result.rows[0] ?? null;
}

export async function getClientById(db, clientId) {
  const result = await db.query(
    `
      select id, name, phone, total_completed, is_recurrent, created_at
      from clients
      where id = $1
      limit 1
    `,
    [clientId]
  );

  return result.rows[0] ?? null;
}

export async function findOrCreateClient(db, payload) {
  const name = normalizeName(payload?.name);
  const phone = normalizePhone(payload?.phone);

  if (!name) {
    throw new AppError("El nombre del cliente es obligatorio.", 400, "VALIDATION_ERROR");
  }
  if (!phone) {
    throw new AppError("El telefono del cliente es obligatorio.", 400, "VALIDATION_ERROR");
  }

  const existing = await findClientByPhone(db, phone);
  if (existing) {
    if (existing.name !== name) {
      const updated = await db.query(
        `
          update clients
          set name = $2
          where id = $1
          returning id, name, phone, total_completed, is_recurrent, created_at
        `,
        [existing.id, name]
      );
      return updated.rows[0];
    }
    return existing;
  }

  const created = await db.query(
    `
      insert into clients(name, phone)
      values ($1, $2)
      returning id, name, phone, total_completed, is_recurrent, created_at
    `,
    [name, phone]
  );

  return created.rows[0];
}

export async function incrementClientCompleted(db, clientId) {
  const client = await getClientById(db, clientId);
  if (!client) {
    throw new AppError("Cliente no encontrado.", 404, "CLIENT_NOT_FOUND");
  }

  const nextTotal = Number(client.total_completed ?? 0) + 1;

  const updated = await db.query(
    `
      update clients
      set total_completed = $2,
          is_recurrent = $3
      where id = $1
      returning id, name, phone, total_completed, is_recurrent, created_at
    `,
    [clientId, nextTotal, nextTotal >= 5]
  );

  return updated.rows[0];
}
