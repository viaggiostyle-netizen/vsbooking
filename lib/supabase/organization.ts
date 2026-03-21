import type { DayKey, OrganizationData, ScheduleBlock, Service } from "@/lib/admin-organization"
import { buildEmptyOrganizationData } from "@/lib/admin-organization"
import { getSupabaseClient } from "@/lib/supabase/client"

type ServicioRow = {
  id: string
  name: string
  price: number
  duration: number
  is_active: boolean
}

type HorarioTrabajoRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

type LegacyServiceRow = {
  id: string
  name: string
  description: string
  price_ars: number
  duration_min: number
  active: boolean
  position: number
}

type LegacyScheduleRow = {
  day_key: DayKey
  active: boolean
  blocks: unknown
}

const DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

const DAY_KEY_TO_WEEKDAY: Record<DayKey, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const WEEKDAY_TO_DAY_KEY: Partial<Record<number, DayKey>> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
}

export async function fetchOrganizationFromSupabase(): Promise<OrganizationData | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const fromLegacy = await fetchOrganizationFromLegacySchema()
  if (fromLegacy) return fromLegacy

  return fetchOrganizationFromNewSchema()
}

export async function persistOrganizationToSupabase(data: OrganizationData): Promise<void> {
  if (typeof window !== "undefined") {
    const res = await fetch("/api/admin/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(payload?.message ?? "No se pudo guardar la organizacion.")
    }
    return
  }

  const supabase = getSupabaseClient()
  if (!supabase) return
  const persistedInNewSchema = await persistOrganizationToNewSchema(data)
  if (persistedInNewSchema) return
  await persistOrganizationToLegacySchema(data)
}

async function fetchOrganizationFromNewSchema(): Promise<OrganizationData | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const fallback = buildEmptyOrganizationData()

  const [{ data: serviciosRows, error: serviciosError }, { data: horariosRows, error: horariosError }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id,name,price,duration,is_active")
        .order("created_at", { ascending: true }),
      supabase
        .from("schedules")
        .select("id,day_of_week,start_time,end_time,is_active")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
    ])

  if (serviciosError || horariosError) return null

  const services = (serviciosRows ?? [])
    .map(normalizeServicioRow)
    .filter((item): item is Service => item !== null)

  const schedules = { ...fallback.schedules }
    ; (horariosRows ?? []).forEach((row, index) => {
      const parsed = normalizeHorarioTrabajoRow(row, index)
      if (!parsed) return
      if (!parsed.enabled) return
      schedules[parsed.dayKey].blocks.push(parsed.block)
    })

  DAY_KEYS.forEach((dayKey) => {
    const dayBlocks = schedules[dayKey].blocks
    schedules[dayKey].active = dayBlocks.length > 0
  })

  return { services, schedules }
}

async function fetchOrganizationFromLegacySchema(): Promise<OrganizationData | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const fallback = buildEmptyOrganizationData()

  const [{ data: servicesRows, error: servicesError }, { data: schedulesRows, error: schedulesError }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id,name,description,price_ars,duration_min,active,position")
        .order("position", { ascending: true }),
      supabase.from("schedules").select("day_key,active,blocks"),
    ])

  if (servicesError || schedulesError) return null

  const services = (servicesRows ?? [])
    .map(normalizeLegacyServiceRow)
    .filter((item): item is Service => item !== null)

  const schedules = { ...fallback.schedules }
    ; (schedulesRows ?? []).forEach((row) => {
      const parsed = normalizeLegacyScheduleRow(row)
      if (!parsed) return
      schedules[parsed.day_key] = parsed.value
    })

  return { services, schedules }
}

async function persistOrganizationToNewSchema(data: OrganizationData): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const servicesPayload = data.services.map((service) => ({
    id: service.id,
    name: service.name,
    price: service.priceArs,
    duration: service.durationMin,
    is_active: service.active,
  }))

  const { data: existingServices, error: existingServicesError } = await supabase
    .from("services")
    .select("id")

  if (existingServicesError) return false

  const existingIds = new Set((existingServices ?? []).map((row) => row.id as string))
  const nextIds = new Set(servicesPayload.map((row) => row.id))
  const toDelete = [...existingIds].filter((id) => !nextIds.has(id))

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from("services").delete().in("id", toDelete)
    if (deleteError) return false
  }

  if (servicesPayload.length > 0) {
    const { error: upsertError } = await supabase
      .from("services")
      .upsert(servicesPayload, { onConflict: "id" })
    if (upsertError) return false
  }

  const deleteDays = Object.values(DAY_KEY_TO_WEEKDAY)
  const { error: deleteHoursError } = await supabase
    .from("schedules")
    .delete()
    .in("day_of_week", deleteDays)

  if (deleteHoursError) return false

  const hoursPayload = DAY_KEYS.flatMap((dayKey) =>
    data.schedules[dayKey].blocks.map((block) => ({
      day_of_week: DAY_KEY_TO_WEEKDAY[dayKey],
      start_time: block.start,
      end_time: block.end,
      is_active: data.schedules[dayKey].active,
    }))
  )

  if (hoursPayload.length > 0) {
    const { error: insertHoursError } = await supabase
      .from("schedules")
      .insert(hoursPayload)
    if (insertHoursError) return false
  }

  return true
}

async function persistOrganizationToLegacySchema(data: OrganizationData): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const servicesPayload = data.services.map((service, index) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price_ars: service.priceArs,
    duration_min: service.durationMin,
    active: service.active,
    position: index,
  }))

  const { data: existingServices, error: existingError } = await supabase.from("services").select("id")
  if (existingError) return

  const existingIds = new Set((existingServices ?? []).map((row) => row.id as string))
  const nextIds = new Set(servicesPayload.map((row) => row.id))
  const toDelete = [...existingIds].filter((id) => !nextIds.has(id))

  if (toDelete.length > 0) {
    await supabase.from("services").delete().in("id", toDelete)
  }

  if (servicesPayload.length > 0) {
    await supabase.from("services").upsert(servicesPayload, { onConflict: "id" })
  }

  const schedulesPayload = DAY_KEYS.map((dayKey) => ({
    day_key: dayKey,
    active: data.schedules[dayKey].active,
    blocks: data.schedules[dayKey].blocks.map((block) => ({
      id: block.id,
      start: block.start,
      end: block.end,
    })),
  }))

  await supabase.from("schedules").upsert(schedulesPayload, { onConflict: "day_key" })
}

function normalizeServicioRow(value: unknown): Service | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<ServicioRow>
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.price !== "number" ||
    typeof row.duration !== "number" ||
    typeof row.is_active !== "boolean"
  ) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    description: "",
    priceArs: row.price,
    durationMin: row.duration,
    active: row.is_active,
  }
}

function normalizeHorarioTrabajoRow(
  value: unknown,
  index: number
): { dayKey: DayKey; enabled: boolean; block: ScheduleBlock } | null {
  if (!value || typeof value !== "object") return null

  const row = value as Partial<HorarioTrabajoRow>
  if (
    typeof row.day_of_week !== "number" ||
    typeof row.start_time !== "string" ||
    typeof row.end_time !== "string"
  ) {
    return null
  }

  const dayKey = WEEKDAY_TO_DAY_KEY[row.day_of_week]
  if (!dayKey) return null

  const start = normalizeTimeValue(row.start_time)
  const end = normalizeTimeValue(row.end_time)
  if (!start || !end) return null

  return {
    dayKey,
    enabled: Boolean(row.is_active),
    block: {
      id: typeof row.id === "string" ? row.id : `${dayKey}-${start}-${end}-${index}`,
      start,
      end,
    },
  }
}

function normalizeLegacyServiceRow(value: unknown): Service | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<LegacyServiceRow>
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.description !== "string" ||
    typeof row.price_ars !== "number" ||
    typeof row.duration_min !== "number" ||
    typeof row.active !== "boolean"
  ) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceArs: row.price_ars,
    durationMin: row.duration_min,
    active: row.active,
  }
}

function normalizeLegacyScheduleRow(
  value: unknown
): { day_key: DayKey; value: { active: boolean; blocks: ScheduleBlock[] } } | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<LegacyScheduleRow>
  if (!row.day_key || !DAY_KEYS.includes(row.day_key)) return null

  const blocks = Array.isArray(row.blocks)
    ? row.blocks
      .map((block) => normalizeLegacyScheduleBlock(block))
      .filter((item): item is ScheduleBlock => item !== null)
    : []

  return {
    day_key: row.day_key,
    value: {
      active: Boolean(row.active),
      blocks,
    },
  }
}

function normalizeLegacyScheduleBlock(value: unknown): ScheduleBlock | null {
  if (!value || typeof value !== "object") return null
  const block = value as Partial<ScheduleBlock>
  if (typeof block.id !== "string" || typeof block.start !== "string" || typeof block.end !== "string") {
    return null
  }

  return {
    id: block.id,
    start: block.start,
    end: block.end,
  }
}

function normalizeTimeValue(value: string): string | null {
  const match = value.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : null
}
