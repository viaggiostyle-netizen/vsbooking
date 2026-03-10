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

export async function updateAppointmentStatus(
  appointmentId: string,
  status: any
) {
  if (!supabase) throw new Error("Supabase client no disponible")

  const canonicalStatus = toCanonicalAppointmentStatus(status)

  // Intenta en 'bookings' q es la q tiene el cliente
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

  // Fallback a 'appointments'
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

  console.error(
    `Error updating appointment status for ID ${appointmentId}:`,
    error.message || error
  )
  throw error
}

export async function cancelAppointment(appointmentId: string) {
  if (!supabase) throw new Error("Supabase client no disponible")

  // Intenta en 'bookings'
  const { error: legacyError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
  if (!legacyError) return

  // Fallback a 'appointments'
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)

  if (!error) return

  console.error(`Error cancelling appointment ID ${appointmentId}:`, error.message || error)
  throw error
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string
) {
  if (!supabase) throw new Error("Supabase client no disponible")

  // Intenta en 'bookings'
  const { error: legacyError } = await supabase
    .from("bookings")
    .update({
      date: newDate,
      time: newTime
    })
    .eq("id", appointmentId)
  if (!legacyError) return

  // Fallback a 'appointments'
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
    error.message || error
  )
  throw error
}

export async function deleteAppointment(appointmentId: string) {
  if (!supabase) throw new Error("Supabase client no disponible")

  // Intenta en 'bookings'
  const { error: legacyError } = await supabase
    .from("bookings")
    .delete()
    .eq("id", appointmentId)
  if (!legacyError) return

  // Fallback a 'appointments'
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)

  if (!error) return

  console.error(`Error deleting appointment ID ${appointmentId}:`, error.message || error)
  throw error
}
