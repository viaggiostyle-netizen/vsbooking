export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"

export type Service = {
  id: string
  name: string
  description: string
  priceArs: number
  durationMin: number
  active: boolean
}

export type ScheduleBlock = {
  id: string
  start: string
  end: string
}

export type DaySchedule = {
  active: boolean
  blocks: ScheduleBlock[]
}

export type ScheduleMap = Record<DayKey, DaySchedule>

export type OrganizationData = {
  services: Service[]
  schedules: ScheduleMap
}

export const ORGANIZATION_STORAGE_KEY = "viaggiostyle_config"
const LEGACY_ORGANIZATION_STORAGE_KEY = "admin-organization-v1"
let syncTimer: ReturnType<typeof setTimeout> | null = null

export const DAY_OPTIONS: Array<{ key: DayKey; label: string }> = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miercoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sabado" },
]

export const BASE_TIME_SLOTS = generateBaseTimeSlots()

export function buildEmptyOrganizationData(): OrganizationData {
  return {
    services: [],
    schedules: {
      monday: { active: false, blocks: [] },
      tuesday: { active: false, blocks: [] },
      wednesday: { active: false, blocks: [] },
      thursday: { active: false, blocks: [] },
      friday: { active: false, blocks: [] },
      saturday: { active: false, blocks: [] },
    },
  }
}

export function readOrganizationData(): OrganizationData {
  if (typeof window === "undefined") return buildEmptyOrganizationData()

  const raw =
    localStorage.getItem(ORGANIZATION_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_ORGANIZATION_STORAGE_KEY)
  if (!raw) return buildEmptyOrganizationData()

  try {
    const parsed = JSON.parse(raw) as Partial<OrganizationData>
    const fallback = buildEmptyOrganizationData()

    return {
      services: Array.isArray(parsed.services)
        ? parsed.services
          .map(normalizeService)
          .filter((service): service is Service => service !== null)
        : [],
      schedules: {
        monday: normalizeDaySchedule(parsed.schedules?.monday, fallback.schedules.monday),
        tuesday: normalizeDaySchedule(parsed.schedules?.tuesday, fallback.schedules.tuesday),
        wednesday: normalizeDaySchedule(parsed.schedules?.wednesday, fallback.schedules.wednesday),
        thursday: normalizeDaySchedule(parsed.schedules?.thursday, fallback.schedules.thursday),
        friday: normalizeDaySchedule(parsed.schedules?.friday, fallback.schedules.friday),
        saturday: normalizeDaySchedule(parsed.schedules?.saturday, fallback.schedules.saturday),
      },
    }
  } catch {
    return buildEmptyOrganizationData()
  }
}

export function saveOrganizationData(data: OrganizationData) {
  if (typeof window === "undefined") return
  localStorage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(data))
  localStorage.setItem(LEGACY_ORGANIZATION_STORAGE_KEY, JSON.stringify(data))
  queueOrganizationSync(data)
}

export async function syncOrganizationFromSupabase(): Promise<OrganizationData | null> {
  const { fetchOrganizationFromSupabase } = await import("@/lib/supabase/organization")
  const remote = await fetchOrganizationFromSupabase()
  if (!remote) return null

  if (typeof window !== "undefined") {
    localStorage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(remote))
    localStorage.setItem(LEGACY_ORGANIZATION_STORAGE_KEY, JSON.stringify(remote))
  }

  return remote
}

function queueOrganizationSync(data: OrganizationData) {
  if (typeof window === "undefined") return
  if (syncTimer) clearTimeout(syncTimer)

  syncTimer = setTimeout(async () => {
    const { persistOrganizationToSupabase } = await import("@/lib/supabase/organization")
    await persistOrganizationToSupabase(data)
  }, 350)
}

export function getDayKeyFromDate(date: Date): DayKey | null {
  const day = date.getDay()
  if (day === 0) return null

  const map: Record<number, DayKey> = {
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  }

  return map[day] ?? null
}

export function getAvailableTimesForDate(date: Date, schedules: ScheduleMap): string[] {
  const dayKey = getDayKeyFromDate(date)
  if (!dayKey) return []

  const schedule = schedules[dayKey]
  if (!schedule?.active || schedule.blocks.length === 0) return []

  return BASE_TIME_SLOTS.filter((slot) =>
    schedule.blocks.some((block) => isTimeInsideBlock(slot, block.start, block.end))
  )
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function generateBaseTimeSlots() {
  const slots: string[] = []

  for (let hour = 9; hour <= 20; hour += 1) {
    const hourFormatted = String(hour).padStart(2, "0")
    slots.push(`${hourFormatted}:00`)
    slots.push(`${hourFormatted}:40`)
  }

  return slots
}

function normalizeService(value: unknown): Service | null {
  if (!value || typeof value !== "object") return null

  const service = value as Partial<Service>
  if (!service.id || typeof service.id !== "string") return null
  if (!service.name || typeof service.name !== "string") return null

  return {
    id: service.id,
    name: service.name,
    description: typeof service.description === "string" ? service.description : "",
    priceArs: typeof service.priceArs === "number" ? service.priceArs : 0,
    durationMin: typeof service.durationMin === "number" ? service.durationMin : 0,
    active: Boolean(service.active),
  }
}

function normalizeDaySchedule(value: unknown, fallback: DaySchedule): DaySchedule {
  if (!value || typeof value !== "object") return fallback

  const day = value as Partial<DaySchedule>

  return {
    active: Boolean(day.active),
    blocks: Array.isArray(day.blocks)
      ? day.blocks
        .map(normalizeScheduleBlock)
        .filter((block): block is ScheduleBlock => block !== null)
      : [],
  }
}

function normalizeScheduleBlock(value: unknown): ScheduleBlock | null {
  if (!value || typeof value !== "object") return null

  const block = value as Partial<ScheduleBlock>
  if (!block.id || typeof block.id !== "string") return null
  if (!isTimeValue(block.start) || !isTimeValue(block.end)) return null

  return {
    id: block.id,
    start: block.start,
    end: block.end,
  }
}

function isTimeValue(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value)
}

function isTimeInsideBlock(time: string, start: string, end: string) {
  const value = timeToMinutes(time)
  const from = timeToMinutes(start)
  const to = timeToMinutes(end)
  return value >= from && value <= to
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}
