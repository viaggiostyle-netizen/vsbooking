import type { AppointmentStatus } from "@/types/Appointment"

export type CanonicalAppointmentStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "no_show"
  | "no_show_with_notice"

export function toCanonicalAppointmentStatus(
  status: AppointmentStatus
): CanonicalAppointmentStatus {
  if (status === "no_vino_aviso") return "no_show_with_notice"
  if (status === "no_vino_no_aviso") return "no_show"
  return status
}

export function toLegacyAppointmentStatus(
  status: CanonicalAppointmentStatus
): AppointmentStatus {
  if (status === "no_show_with_notice") return "no_vino_aviso"
  if (status === "no_show") return "no_vino_no_aviso"
  return status
}

export function isCompletedStatus(status: AppointmentStatus) {
  return toCanonicalAppointmentStatus(status) === "completed"
}

export function isNoShowWithNoticeStatus(status: AppointmentStatus) {
  return toCanonicalAppointmentStatus(status) === "no_show_with_notice"
}

export function isNoShowStatus(status: AppointmentStatus) {
  return toCanonicalAppointmentStatus(status) === "no_show"
}

export function isCancelledStatus(status: AppointmentStatus) {
  return toCanonicalAppointmentStatus(status) === "cancelled"
}
