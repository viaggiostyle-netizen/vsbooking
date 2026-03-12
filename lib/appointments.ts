import { toCanonicalAppointmentStatus, toLegacyAppointmentStatus } from "@/lib/appointment-status"
import { supabase } from "@/lib/supabase"

export type AppointmentStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "no_show"
  | "no_show_with_notice"
  | "no_vino_aviso"
  | "no_vino_no_aviso"

async function bookingsApiPatch(body: { id: string; status?: string; date?: string; time?: string }) {
  const res = await fetch("/api/bookings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? "No se pudo actualizar la reserva.")
  }
}

async function bookingsApiDelete(id: string) {
  const res = await fetch("/api/bookings", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
    credentials: "same-origin",
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? "No se pudo eliminar la reserva.")
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: any
) {
  if (typeof window !== "undefined") {
    await bookingsApiPatch({
      id: appointmentId,
      status: toLegacyAppointmentStatus(toCanonicalAppointmentStatus(status)),
    })
    return
  }

  if (!supabase) throw new Error("Supabase client no disponible")
  const canonicalStatus = toCanonicalAppointmentStatus(status)

  const { data: legacyData, error: legacyError } = await supabase
    .from("bookings")
    .update({
      status: toLegacyAppointmentStatus(canonicalStatus),
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .select()
    .single()
  if (!legacyError) return legacyData

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: canonicalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .select()
    .single()
  if (!error) return data
  console.error(`Error updating appointment status for ID ${appointmentId}:`, error.message || error)
  throw error
}

export async function cancelAppointment(appointmentId: string) {
  if (typeof window !== "undefined") {
    await bookingsApiPatch({ id: appointmentId, status: "cancelled" })
    return
  }

  if (!supabase) throw new Error("Supabase client no disponible")
  const { error: legacyError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
  if (!legacyError) return
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
  if (!error) return
  console.error(`Error cancelling appointment ID ${appointmentId}:`, error?.message || error)
  throw error
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string
) {
  if (typeof window !== "undefined") {
    await bookingsApiPatch({ id: appointmentId, date: newDate, time: newTime })
    return
  }

  if (!supabase) throw new Error("Supabase client no disponible")
  const { error: legacyError } = await supabase
    .from("bookings")
    .update({ date: newDate, time: newTime })
    .eq("id", appointmentId)
  if (!legacyError) return
  const { error } = await supabase
    .from("appointments")
    .update({
      appointment_date: newDate,
      appointment_time: newTime,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
  if (!error) return
  console.error(
    `Error rescheduling appointment ID ${appointmentId} to ${newDate} ${newTime}:`,
    error?.message || error
  )
  throw error
}

export async function deleteAppointment(appointmentId: string) {
  if (typeof window !== "undefined") {
    await bookingsApiDelete(appointmentId)
    return
  }

  if (!supabase) throw new Error("Supabase client no disponible")
  const { error: legacyError } = await supabase
    .from("bookings")
    .delete()
    .eq("id", appointmentId)
  if (!legacyError) return
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
  if (!error) return
  console.error(`Error deleting appointment ID ${appointmentId}:`, error?.message || error)
  throw error
}
