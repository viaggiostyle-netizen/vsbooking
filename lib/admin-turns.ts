export type TurnStatus = "pending" | "completed" | "no_show" | "cancelled"

export type TurnRecord = {
  id: string
  clientName: string
  phone: string
  dateKey: string
  time: string
  serviceId: string
  serviceName: string
  priceArs: number
  status: TurnStatus
  createdAtISO: string
}

export const TURN_STORAGE_KEY = "admin-turns-v1"

export function readTurns(): TurnRecord[] {
  if (typeof window === "undefined") return []

  const raw = localStorage.getItem(TURN_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(normalizeTurn)
      .filter((turn): turn is TurnRecord => turn !== null)
  } catch {
    return []
  }
}

export function saveTurns(turns: TurnRecord[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(TURN_STORAGE_KEY, JSON.stringify(turns))
}

function normalizeTurn(value: unknown): TurnRecord | null {
  if (!value || typeof value !== "object") return null

  const turn = value as Partial<TurnRecord>

  if (typeof turn.id !== "string") return null
  if (typeof turn.clientName !== "string") return null
  if (typeof turn.phone !== "string") return null
  if (!isDateKey(turn.dateKey)) return null
  if (!isTimeValue(turn.time)) return null
  if (typeof turn.serviceId !== "string") return null
  if (typeof turn.serviceName !== "string") return null
  if (typeof turn.priceArs !== "number") return null
  if (!isStatus(turn.status)) return null
  if (typeof turn.createdAtISO !== "string") return null

  return {
    id: turn.id,
    clientName: turn.clientName,
    phone: turn.phone,
    dateKey: turn.dateKey,
    time: turn.time,
    serviceId: turn.serviceId,
    serviceName: turn.serviceName,
    priceArs: turn.priceArs,
    status: turn.status,
    createdAtISO: turn.createdAtISO,
  }
}

function isStatus(value: unknown): value is TurnStatus {
  return (
    value === "pending" ||
    value === "completed" ||
    value === "no_show" ||
    value === "cancelled"
  )
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isTimeValue(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value)
}
