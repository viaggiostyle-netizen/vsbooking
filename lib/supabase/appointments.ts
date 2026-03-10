import {
  toCanonicalAppointmentStatus,
  toLegacyAppointmentStatus,
} from "@/lib/appointment-status"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Appointment } from "@/types/Appointment"

type AppointmentsRow = {
  id: string
  client_name: string
  client_phone: string
  service_name: string
  service_price: number
  service_duration: number
  appointment_date: string
  appointment_time: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

type LegacyBookingRow = {
  id: string
  booking_group_id: string
  client_name: string
  client_phone: string
  client_email: string
  service_id: string
  service_name: string
  duration_min: number
  price: number
  original_price: number
  final_price: number
  promotion_id: string | null
  date: string
  time: string
  status: string
  created_at: string
}

const APPOINTMENTS_SELECT =
  "id,client_name,client_phone,service_name,service_price,service_duration,appointment_date,appointment_time,status,notes,created_at,updated_at"
const LEGACY_BOOKINGS_SELECT =
  "id,booking_group_id,client_name,client_phone,client_email,service_id,service_name,duration_min,price,original_price,final_price,promotion_id,date,time,status,created_at"

type AppointmentPatch = Partial<
  Pick<
    Appointment,
    | "date"
    | "time"
    | "status"
    | "service"
    | "serviceId"
    | "durationMin"
    | "price"
    | "originalPrice"
    | "finalPrice"
  >
>

export async function fetchAppointmentsFromSupabase(): Promise<Appointment[] | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data: bookingsData, error: bookingsError } = await supabase
    .from("bookings")
    .select(LEGACY_BOOKINGS_SELECT)
    .order("created_at", { ascending: true })

  if (!bookingsError) {
    return (bookingsData ?? [])
      .map((row) => normalizeLegacyBookingRow(row))
      .filter((item): item is Appointment => item !== null)
  }

  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from("appointments")
    .select(APPOINTMENTS_SELECT)
    .order("created_at", { ascending: true })

  if (appointmentsError) return null

  return (appointmentsData ?? [])
    .map((row) => normalizeAppointmentsRow(row))
    .filter((item): item is Appointment => item !== null)
}

export async function upsertAppointmentsToSupabase(
  appointments: Appointment[]
): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase || appointments.length === 0) return

  const legacyPayload = appointments.map((appointment) => ({
    id: appointment.id,
    booking_group_id: appointment.bookingGroupId,
    client_name: appointment.clientName,
    client_phone: appointment.clientPhone,
    client_email: appointment.clientEmail,
    service_id: appointment.serviceId,
    service_name: appointment.service,
    duration_min: appointment.durationMin,
    price: appointment.price,
    original_price: appointment.originalPrice,
    final_price: appointment.finalPrice,
    promotion_id: appointment.promotionId,
    date: appointment.date,
    time: appointment.time,
    status: toLegacyAppointmentStatus(
      toCanonicalAppointmentStatus(appointment.status)
    ),
    created_at: appointment.createdAt,
  }))

  const { error: legacyError } = await supabase
    .from("bookings")
    .upsert(legacyPayload, { onConflict: "id" })

  if (!legacyError) return

  const appointmentsPayload = appointments.map((appointment) => ({
    id: appointment.id,
    client_name: appointment.clientName,
    client_phone: appointment.clientPhone,
    service_name: appointment.service,
    service_price: appointment.finalPrice,
    service_duration: appointment.durationMin,
    appointment_date: appointment.date,
    appointment_time: appointment.time,
    status: toCanonicalAppointmentStatus(appointment.status),
    notes: null,
    created_at: appointment.createdAt,
  }))

  await supabase
    .from("appointments")
    .upsert(appointmentsPayload, { onConflict: "id" })
}

export async function patchAppointmentInSupabase(
  id: string,
  patch: AppointmentPatch
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const appointmentsPayload: Partial<AppointmentsRow> = {}
  if (patch.date) appointmentsPayload.appointment_date = patch.date
  if (patch.time) appointmentsPayload.appointment_time = patch.time
  if (patch.status) {
    appointmentsPayload.status = toCanonicalAppointmentStatus(patch.status)
  }
  if (patch.service) appointmentsPayload.service_name = patch.service
  if (typeof patch.durationMin === "number") {
    appointmentsPayload.service_duration = patch.durationMin
  }
  if (typeof patch.finalPrice === "number") {
    appointmentsPayload.service_price = patch.finalPrice
  } else if (typeof patch.price === "number") {
    appointmentsPayload.service_price = patch.price
  }

  let updatedAppointments = false
  if (Object.keys(appointmentsPayload).length > 0) {
    const { error: updateError } = await supabase
      .from("appointments")
      .update(appointmentsPayload)
      .eq("id", id)

    updatedAppointments = !updateError
  }

  if (updatedAppointments) return true

  const legacyPayload: Partial<LegacyBookingRow> = {}
  if (patch.date) legacyPayload.date = patch.date
  if (patch.time) legacyPayload.time = patch.time
  if (patch.status) {
    legacyPayload.status = toLegacyAppointmentStatus(
      toCanonicalAppointmentStatus(patch.status)
    )
  }
  if (patch.service) legacyPayload.service_name = patch.service
  if (patch.serviceId) legacyPayload.service_id = patch.serviceId
  if (typeof patch.durationMin === "number") {
    legacyPayload.duration_min = patch.durationMin
  }
  if (typeof patch.price === "number") {
    legacyPayload.price = patch.price
    legacyPayload.original_price = patch.price
    legacyPayload.final_price = patch.price
  }
  if (typeof patch.originalPrice === "number") {
    legacyPayload.original_price = patch.originalPrice
  }
  if (typeof patch.finalPrice === "number") {
    legacyPayload.final_price = patch.finalPrice
    if (typeof patch.price !== "number") legacyPayload.price = patch.finalPrice
  }

  if (Object.keys(legacyPayload).length === 0) return false

  const { error: legacyError } = await supabase
    .from("bookings")
    .update(legacyPayload)
    .eq("id", id)

  return !legacyError
}

function normalizeAppointmentsRow(value: unknown): Appointment | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<AppointmentsRow>

  const date = normalizeDateValue(row.appointment_date)
  const time = normalizeTimeValue(row.appointment_time)
  const status = normalizeStatus(row.status)

  if (
    typeof row.id !== "string" ||
    typeof row.client_name !== "string" ||
    typeof row.client_phone !== "string" ||
    typeof row.service_name !== "string" ||
    typeof row.service_price !== "number" ||
    typeof row.service_duration !== "number" ||
    !date ||
    !time ||
    !status ||
    typeof row.created_at !== "string"
  ) {
    return null
  }

  return {
    id: row.id,
    bookingGroupId: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: "",
    serviceId: row.service_name,
    service: row.service_name,
    durationMin: row.service_duration,
    price: row.service_price,
    originalPrice: row.service_price,
    finalPrice: row.service_price,
    promotionId: null,
    date,
    time,
    status,
    createdAt: row.created_at,
  }
}

function normalizeLegacyBookingRow(value: unknown): Appointment | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<LegacyBookingRow>

  const date = normalizeDateValue(row.date)
  const time = normalizeTimeValue(row.time)
  const status = normalizeStatus(row.status)

  if (
    typeof row.id !== "string" ||
    typeof row.booking_group_id !== "string" ||
    typeof row.client_name !== "string" ||
    typeof row.client_phone !== "string" ||
    typeof row.client_email !== "string" ||
    typeof row.service_name !== "string" ||
    typeof row.duration_min !== "number" ||
    typeof row.price !== "number" ||
    typeof row.original_price !== "number" ||
    typeof row.final_price !== "number" ||
    !date ||
    !time ||
    !status ||
    typeof row.created_at !== "string"
  ) {
    return null
  }

  return {
    id: row.id,
    bookingGroupId: row.booking_group_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    serviceId: row.service_id ?? "",
    service: row.service_name,
    durationMin: row.duration_min,
    price: row.price,
    originalPrice: row.original_price,
    finalPrice: row.final_price,
    promotionId: row.promotion_id ?? null,
    date,
    time,
    status,
    createdAt: row.created_at,
  }
}

function normalizeStatus(value: unknown): Appointment["status"] | null {
  if (typeof value !== "string") return null

  if (
    value !== "pending" &&
    value !== "completed" &&
    value !== "cancelled" &&
    value !== "no_show" &&
    value !== "no_show_with_notice" &&
    value !== "no_vino_aviso" &&
    value !== "no_vino_no_aviso"
  ) {
    return null
  }

  return toCanonicalAppointmentStatus(value)
}

function normalizeDateValue(value: unknown): string | null {
  if (typeof value !== "string") return null
  const match = value.match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

function normalizeTimeValue(value: unknown): string | null {
  if (typeof value !== "string") return null
  const match = value.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : null
}
