import {
  isCompletedStatus,
  isNoShowStatus,
  type CanonicalAppointmentStatus,
} from "@/lib/appointment-status"
import { patchAppointmentInSupabase, fetchAppointmentsFromSupabase } from "@/lib/supabase/appointments"
import { getSupabaseClient } from "@/lib/supabase/client"
import { normalizePhone } from "@/lib/utils"
import type { Appointment } from "@/types/Appointment"

export type ClienteRecord = {
  id: string
  name: string
  phone: string
  totalCompleted: number
  totalNoShow: number
  totalCancelled: number
  totalSpent: number
  isRecurrent: boolean
  createdAt: string
}

export type IngresoRecord = {
  id: string
  appointmentId: string
  clientName: string
  clientPhone: string
  serviceName: string
  amount: number
  createdAt: string
}

export type MetricasRecord = {
  totalIngresos: number
  totalTurnos: number
  totalClientes: number
  totalNoShow: number
}

export async function syncAppointmentStatusAction(args: {
  appointment: Appointment
  nextStatus: CanonicalAppointmentStatus
  previousStatus?: Appointment["status"]
}) {
  const { appointment, nextStatus, previousStatus } = args
  const updated = await patchAppointmentInSupabase(appointment.id, { status: nextStatus })
  if (!updated) throw new Error("No se pudo actualizar el estado del turno.")

  if (nextStatus === "completed") {
    const incomeResult = await upsertIngresoFromAppointment(appointment)
    if (incomeResult === "inserted") {
      await upsertClienteTotals(appointment, "completed")
    }
    await saveClientHistory(appointment, nextStatus)
  }

  if (
    nextStatus === "no_show_with_notice" &&
    previousStatus !== "no_show_with_notice" &&
    previousStatus !== "no_vino_aviso"
  ) {
    await Promise.all([
      upsertClienteTotals(appointment, "no_show_with_notice"),
      saveClientHistory(appointment, nextStatus),
    ])
  }

  if (
    nextStatus === "no_show" &&
    previousStatus !== "no_show" &&
    previousStatus !== "no_vino_no_aviso"
  ) {
    await Promise.all([
      upsertClienteTotals(appointment, "no_show"),
      saveClientHistory(appointment, nextStatus),
    ])
  }

  if (nextStatus === "cancelled") {
    await saveClientHistory(appointment, nextStatus)
  }

  await persistMetricasSnapshot()
}

export async function refetchAgendaCollections() {
  const [appointments, clientes, ingresos, metricas] = await Promise.all([
    fetchAppointmentsFromSupabase(),
    fetchClientesFromSupabase(),
    fetchIngresosFromSupabase(),
    fetchMetricasFromSupabase(),
  ])

  return {
    appointments: appointments ?? [],
    clientes,
    ingresos,
    metricas,
  }
}

export async function fetchClientesFromSupabase(): Promise<ClienteRecord[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id,name,phone,total_completed,total_no_show,total_cancelled,total_spent,is_recurrent,created_at"
    )
    .order("created_at", { ascending: false })

  if (error) return []

  return (data ?? [])
    .map((row) => normalizeClienteRow(row))
    .filter((item): item is ClienteRecord => item !== null)
}

export async function fetchIngresosFromSupabase(): Promise<IngresoRecord[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("ingresos")
    .select("id,appointment_id,client_name,client_phone,service_name,amount,created_at")
    .order("created_at", { ascending: false })

  if (error) return []

  return (data ?? [])
    .map((row) => normalizeIngresoRow(row))
    .filter((item): item is IngresoRecord => item !== null)
}

export async function fetchMetricasFromSupabase(): Promise<MetricasRecord> {
  const supabase = getSupabaseClient()
  if (!supabase) return buildMetricasSnapshot()

  const { data, error } = await supabase
    .from("metricas")
    .select("total_ingresos,total_turnos,total_clientes,total_no_show")
    .limit(1)
    .maybeSingle()

  if (error || !data) return buildMetricasSnapshot()

  const row = data as {
    total_ingresos?: unknown
    total_turnos?: unknown
    total_clientes?: unknown
    total_no_show?: unknown
  }

  return {
    totalIngresos: numberOrZero(row.total_ingresos),
    totalTurnos: numberOrZero(row.total_turnos),
    totalClientes: numberOrZero(row.total_clientes),
    totalNoShow: numberOrZero(row.total_no_show),
  }
}

async function upsertIngresoFromAppointment(
  appointment: Appointment
): Promise<"inserted" | "existing" | "failed"> {
  const supabase = getSupabaseClient()
  if (!supabase) return "failed"

  const payload = {
    appointment_id: appointment.id,
    client_name: appointment.clientName,
    client_phone: appointment.clientPhone,
    service_name: appointment.service,
    amount: appointment.finalPrice,
    created_at: new Date().toISOString(),
  }

  const { data: existing, error: existingError } = await supabase
    .from("ingresos")
    .select("id")
    .eq("appointment_id", appointment.id)
    .limit(1)
    .maybeSingle()

  if (existingError) return "failed"

  if (existing && typeof existing.id === "string") {
    await supabase.from("ingresos").update(payload).eq("id", existing.id)
    return "existing"
  }

  const { error: insertError } = await supabase.from("ingresos").insert(payload)
  if (insertError) return "failed"

  return "inserted"
}

async function upsertClienteTotals(
  appointment: Appointment,
  status: "completed" | "no_show" | "no_show_with_notice"
) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const phone = normalizePhone(appointment.clientPhone) || appointment.clientPhone.trim()
  if (!phone) return

  const { data: existing, error: existingError } = await supabase
    .from("clientes")
    .select(
      "id,name,phone,total_completed,total_no_show,total_cancelled,total_spent,is_recurrent"
    )
    .eq("phone", phone)
    .limit(1)
    .maybeSingle()

  if (existingError) return

  const current = existing as
    | {
        id: string
        name?: unknown
        phone?: unknown
        total_completed?: unknown
        total_no_show?: unknown
        total_cancelled?: unknown
        total_spent?: unknown
        is_recurrent?: unknown
      }
    | null

  const nextCompleted = numberOrZero(current?.total_completed)
  const nextNoShow = numberOrZero(current?.total_no_show)
  const nextCancelled = numberOrZero(current?.total_cancelled)
  const nextSpent = numberOrZero(current?.total_spent)

  const totals = {
    total_completed: status === "completed" ? nextCompleted + 1 : nextCompleted,
    total_no_show: status === "no_show" ? nextNoShow + 1 : nextNoShow,
    total_cancelled:
      status === "no_show_with_notice" ? nextCancelled + 1 : nextCancelled,
    total_spent: status === "completed" ? nextSpent + appointment.finalPrice : nextSpent,
  }

  const payload = {
    name: appointment.clientName,
    phone,
    ...totals,
    is_recurrent: totals.total_completed >= 5,
  }

  if (current && typeof current.id === "string") {
    await supabase.from("clientes").update(payload).eq("id", current.id)
    return
  }

  await supabase.from("clientes").insert({
    ...payload,
    created_at: new Date().toISOString(),
  })
}

async function saveClientHistory(
  appointment: Appointment,
  status: CanonicalAppointmentStatus
) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const newPayload = {
    client_phone: appointment.clientPhone,
    appointment_id: appointment.id,
    event_type: status,
    event_date: new Date().toISOString(),
  }

  const { error: newSchemaError } = await supabase
    .from("historial_clientes")
    .insert(newPayload)

  if (!newSchemaError) return

  // Legacy fallback.
  await supabase.from("clientes_historial").insert({
    appointment_id: appointment.id,
    client_name: appointment.clientName,
    client_phone: appointment.clientPhone,
    service_name: appointment.service,
    date: appointment.date,
    time: appointment.time,
    status,
    created_at: new Date().toISOString(),
  })
}

async function persistMetricasSnapshot() {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const snapshot = await buildMetricasSnapshot()

  const payload = {
    total_ingresos: snapshot.totalIngresos,
    total_turnos: snapshot.totalTurnos,
    total_clientes: snapshot.totalClientes,
    total_no_show: snapshot.totalNoShow,
    updated_at: new Date().toISOString(),
  }

  const { data: existing, error: existingError } = await supabase
    .from("metricas")
    .select("id")
    .limit(1)
    .maybeSingle()

  if (existingError) return

  if (existing && typeof existing.id === "string") {
    await supabase.from("metricas").update(payload).eq("id", existing.id)
    return
  }

  await supabase.from("metricas").insert(payload)
}

async function buildMetricasSnapshot(): Promise<MetricasRecord> {
  const [appointments, clientes] = await Promise.all([
    fetchAppointmentsFromSupabase(),
    fetchClientesFromSupabase(),
  ])

  const safeAppointments = appointments ?? []

  const totalIngresos = safeAppointments
    .filter((item) => isCompletedStatus(item.status))
    .reduce((sum, item) => sum + item.finalPrice, 0)
  const totalTurnos = safeAppointments.length
  const totalClientes = clientes.length
  const totalNoShow = safeAppointments.filter((item) => isNoShowStatus(item.status))
    .length

  return {
    totalIngresos,
    totalTurnos,
    totalClientes,
    totalNoShow,
  }
}

function normalizeClienteRow(value: unknown): ClienteRecord | null {
  if (!value || typeof value !== "object") return null

  const row = value as {
    id?: unknown
    name?: unknown
    phone?: unknown
    total_completed?: unknown
    total_no_show?: unknown
    total_cancelled?: unknown
    total_spent?: unknown
    is_recurrent?: unknown
    created_at?: unknown
  }

  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.phone !== "string"
  ) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    totalCompleted: numberOrZero(row.total_completed),
    totalNoShow: numberOrZero(row.total_no_show),
    totalCancelled: numberOrZero(row.total_cancelled),
    totalSpent: numberOrZero(row.total_spent),
    isRecurrent: Boolean(row.is_recurrent),
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(0).toISOString(),
  }
}

function normalizeIngresoRow(value: unknown): IngresoRecord | null {
  if (!value || typeof value !== "object") return null

  const row = value as {
    id?: unknown
    appointment_id?: unknown
    client_name?: unknown
    client_phone?: unknown
    service_name?: unknown
    amount?: unknown
    created_at?: unknown
  }

  if (
    typeof row.id !== "string" ||
    typeof row.appointment_id !== "string" ||
    typeof row.client_name !== "string" ||
    typeof row.client_phone !== "string" ||
    typeof row.service_name !== "string"
  ) {
    return null
  }

  return {
    id: row.id,
    appointmentId: row.appointment_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    serviceName: row.service_name,
    amount: numberOrZero(row.amount),
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(0).toISOString(),
  }
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
