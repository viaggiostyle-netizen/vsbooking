import { Settings } from "@/types/Settings"

type CancellationResult = {
  allowed: boolean
  remainingHours: number
  message: string | null
  whatsappUrl: string
  whatsappPhone: string
}

export function evaluateCancellationRule(
  appointmentDate: string,
  appointmentTime: string,
  settings: Settings,
  now = new Date()
): CancellationResult {
  const target = toLocalDate(appointmentDate, appointmentTime)
  const diffHours = (target.getTime() - now.getTime()) / 3600000
  const remainingHours = Number.isFinite(diffHours) ? diffHours : -999

  const whatsappPhone = normalizeWhatsappPhone(settings.whatsappContact)
  const whatsappUrl = buildWhatsappUrl(settings.whatsappContact)

  if (remainingHours >= settings.cancellationMinHours) {
    return {
      allowed: true,
      remainingHours,
      message: null,
      whatsappUrl,
      whatsappPhone,
    }
  }

  const contactText = whatsappPhone ? ` Contacto: +${whatsappPhone}` : ""

  return {
    allowed: false,
    remainingHours,
    message: `${settings.cancellationBlockedMessage}${contactText}`,
    whatsappUrl,
    whatsappPhone,
  }
}

export function buildWhatsappUrl(phone: string): string {
  const normalized = normalizeWhatsappPhone(phone)
  if (!normalized) return ""
  return `https://wa.me/${normalized}`
}

export function normalizeWhatsappPhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function canCancelAppointment(
  appointmentDate: string,
  appointmentTime: string,
  settings: Settings,
  now = new Date()
): boolean {
  return evaluateCancellationRule(appointmentDate, appointmentTime, settings, now).allowed
}

function toLocalDate(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return new Date(NaN)
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}
