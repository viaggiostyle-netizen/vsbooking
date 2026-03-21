import { toCanonicalAppointmentStatus } from "@/lib/appointment-status"
import { supabase } from "@/lib/supabase"
import type { Appointment } from "@/types/Appointment"

type AppointmentRow = {
  id: string
  client_name: string
  client_phone: string
  service_name: string
  service_price: number
  service_duration: number
  appointment_date: string
  appointment_time: string
  status: Appointment["status"] | string
  created_at: string
}

type LegacyAppointmentRow = {
  id: string
  booking_group_id?: string | null
  client_name: string
  client_phone: string
  client_email?: string | null
  service_id?: string | null
  service_name?: string | null
  service?: string | null
  duration_min?: number | null
  price?: number | null
  original_price?: number | null
  final_price?: number | null
  promotion_id?: string | null
  date: string
  time: string
  status: Appointment["status"] | string
  created_at: string
}

export async function fetchAppointments(): Promise<Appointment[]> {
  if (!supabase) return []

  // Intenta cargar desde 'bookings' (legacy) primero ya q es la q existe
  const { data: legacyData, error: legacyError } = await supabase
    .from("bookings")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true })

  if (!legacyError) {
    return (legacyData ?? [])
      .map((row) => normalizeLegacyRow(row))
      .filter((item): item is Appointment => item !== null)
  }

  // Fallback a 'appointments' (nuevo esquema)
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })

  if (error) {
    console.error("Error crítico: No se encontró ni 'appointments' ni 'bookings'.", error.message)
    throw error
  }

  return (data ?? [])
    .map((row) => normalizeAppointmentRow(row))
    .filter((item): item is Appointment => item !== null)
}

function normalizeLegacyRow(value: unknown): Appointment | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<LegacyAppointmentRow>

  if (
    typeof item.id !== "string" ||
    typeof item.client_name !== "string" ||
    typeof item.client_phone !== "string" ||
    typeof item.date !== "string" ||
    typeof item.time !== "string" ||
    typeof item.status !== "string" ||
    typeof item.created_at !== "string"
  ) {
    return null
  }

  const status = normalizeStatus(item.status)
  if (!status) return null

  return {
    id: item.id,
    bookingGroupId: item.booking_group_id || item.id,
    clientName: item.client_name,
    clientPhone: item.client_phone,
    clientEmail: item.client_email || "",
    serviceId: item.service_id || "",
    service: item.service_name || item.service || "",
    durationMin: item.duration_min || 0,
    price: item.price || 0,
    originalPrice: item.original_price || item.price || 0,
    finalPrice: item.final_price || item.price || 0,
    promotionId: item.promotion_id || null,
    date: item.date,
    time: item.time,
    status,
    createdAt: item.created_at,
  }
}

function normalizeAppointmentRow(value: unknown): Appointment | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<AppointmentRow>

  const date = normalizeDateValue(row.appointment_date)
  const time = normalizeTimeValue(row.appointment_time)
  const status =
    typeof row.status === "string"
      ? normalizeStatus(row.status)
      : null

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

function normalizeStatus(status: string): Appointment["status"] | null {
  if (
    status !== "pending" &&
    status !== "completed" &&
    status !== "cancelled" &&
    status !== "no_show" &&
    status !== "no_show_with_notice" &&
    status !== "no_vino_aviso" &&
    status !== "no_vino_no_aviso"
  ) {
    return null
  }

  return toCanonicalAppointmentStatus(status)
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
