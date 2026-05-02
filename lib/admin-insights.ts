import { toCanonicalAppointmentStatus } from "@/lib/appointment-status"
import type { Appointment } from "@/types/Appointment"

const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"]

export type ServicePerformance = {
  service: string
  completedCount: number
  revenue: number
  averageTicket: number
}

export type WeekdayPerformance = {
  weekday: number
  label: string
  bookedCount: number
  completedCount: number
  revenue: number
}

export type HourPerformance = {
  time: string
  bookedCount: number
  completedCount: number
  revenue: number
}

export type DailyPerformance = {
  date: string
  bookedCount: number
  completedCount: number
  revenue: number
  averageTicket: number
}

export type ClientInsight = {
  totalSpent: number
  favoriteService: string
  lastVisit: string
  averageGapDays: number | null
  completedCount: number
  noShowCount: number
  cancelledCount: number
  bookedCount: number
}

export function isCompletedAppointment(appointment: Appointment) {
  return toCanonicalAppointmentStatus(appointment.status) === "completed"
}

export function isBookedAppointment(appointment: Appointment) {
  return toCanonicalAppointmentStatus(appointment.status) !== "cancelled"
}

export function isOperationalClientAppointment(appointment: Appointment) {
  const canonical = toCanonicalAppointmentStatus(appointment.status)
  return canonical === "completed" || canonical === "no_show" || canonical === "no_show_with_notice"
}

export function buildClientKeyFromAppointment(appointment: Appointment) {
  const normalizedPhone = normalizePhoneDigits(appointment.clientPhone)
  if (normalizedPhone) return `phone:${normalizedPhone}`
  return `name:${appointment.clientName.trim().toLowerCase()}`
}

export function normalizePhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""

  let normalized = digits
  while (normalized.startsWith("549549")) {
    normalized = normalized.slice(3)
  }

  return normalized
}

export function buildServicePerformance(appointments: Appointment[]) {
  const byService = new Map<string, { completedCount: number; revenue: number }>()

  appointments.forEach((appointment) => {
    if (!isCompletedAppointment(appointment)) return

    const current = byService.get(appointment.service) ?? { completedCount: 0, revenue: 0 }
    current.completedCount += 1
    current.revenue += appointment.price
    byService.set(appointment.service, current)
  })

  return [...byService.entries()]
    .map(([service, data]) => ({
      service,
      completedCount: data.completedCount,
      revenue: data.revenue,
      averageTicket: data.completedCount > 0 ? data.revenue / data.completedCount : 0,
    }))
    .sort((left, right) => {
      if (right.revenue !== left.revenue) return right.revenue - left.revenue
      return right.completedCount - left.completedCount
    })
}

export function buildWeekdayPerformance(appointments: Appointment[]) {
  const byWeekday = new Map<number, WeekdayPerformance>()

  appointments.forEach((appointment) => {
    const weekday = dateKeyToDate(appointment.date).getDay()
    const current =
      byWeekday.get(weekday) ??
      {
        weekday,
        label: WEEKDAY_LABELS[weekday] ?? "Dia",
        bookedCount: 0,
        completedCount: 0,
        revenue: 0,
      }

    if (isBookedAppointment(appointment)) current.bookedCount += 1
    if (isCompletedAppointment(appointment)) {
      current.completedCount += 1
      current.revenue += appointment.price
    }

    byWeekday.set(weekday, current)
  })

  return [...byWeekday.values()].sort((left, right) => right.bookedCount - left.bookedCount)
}

export function buildHourPerformance(appointments: Appointment[]) {
  const byHour = new Map<string, HourPerformance>()

  appointments.forEach((appointment) => {
    const current =
      byHour.get(appointment.time) ??
      {
        time: appointment.time,
        bookedCount: 0,
        completedCount: 0,
        revenue: 0,
      }

    if (isBookedAppointment(appointment)) current.bookedCount += 1
    if (isCompletedAppointment(appointment)) {
      current.completedCount += 1
      current.revenue += appointment.price
    }

    byHour.set(appointment.time, current)
  })

  return [...byHour.values()].sort((left, right) => {
    if (right.bookedCount !== left.bookedCount) return right.bookedCount - left.bookedCount
    return left.time.localeCompare(right.time)
  })
}

export function buildDailyPerformance(appointments: Appointment[]) {
  const byDate = new Map<string, Omit<DailyPerformance, "averageTicket">>()

  appointments.forEach((appointment) => {
    const current =
      byDate.get(appointment.date) ??
      {
        date: appointment.date,
        bookedCount: 0,
        completedCount: 0,
        revenue: 0,
      }

    if (isBookedAppointment(appointment)) current.bookedCount += 1
    if (isCompletedAppointment(appointment)) {
      current.completedCount += 1
      current.revenue += appointment.price
    }

    byDate.set(appointment.date, current)
  })

  return [...byDate.values()]
    .map((item) => ({
      ...item,
      averageTicket: item.completedCount > 0 ? item.revenue / item.completedCount : 0,
    }))
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function deriveClientInsight(history: Appointment[]): ClientInsight {
  const sorted = [...history].sort((left, right) =>
    `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`)
  )
  const completed = sorted.filter(isCompletedAppointment)
  const booked = sorted.filter(isBookedAppointment)
  const noShowCount = sorted.filter((appointment) => {
    const canonical = toCanonicalAppointmentStatus(appointment.status)
    return canonical === "no_show" || canonical === "no_show_with_notice"
  }).length
  const cancelledCount = sorted.filter(
    (appointment) => toCanonicalAppointmentStatus(appointment.status) === "cancelled"
  ).length
  const totalSpent = completed.reduce((sum, appointment) => sum + appointment.price, 0)
  const favoriteService = getFavoriteService(sorted)
  const lastVisit = completed.at(-1)?.date ?? booked.at(-1)?.date ?? ""

  return {
    totalSpent,
    favoriteService,
    lastVisit,
    averageGapDays: calculateAverageGapDays(completed),
    completedCount: completed.length,
    noShowCount,
    cancelledCount,
    bookedCount: booked.length,
  }
}

export function formatDateKeyShort(dateKey: string) {
  const date = dateKeyToDate(dateKey)
  if (Number.isNaN(date.getTime())) return dateKey

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function formatWeekdayShort(dateKey: string) {
  const date = dateKeyToDate(dateKey)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("es-AR", { weekday: "short" })
    .format(date)
    .replace(".", "")
}

function getFavoriteService(appointments: Appointment[]) {
  const counter = new Map<string, number>()

  appointments.forEach((appointment) => {
    counter.set(appointment.service, (counter.get(appointment.service) ?? 0) + 1)
  })

  const favorite = [...counter.entries()].sort((left, right) => right[1] - left[1])[0]
  return favorite?.[0] ?? "Sin datos"
}

function calculateAverageGapDays(appointments: Appointment[]) {
  if (appointments.length < 2) return null

  let totalGapDays = 0

  for (let index = 1; index < appointments.length; index += 1) {
    const previous = dateKeyToDate(appointments[index - 1].date)
    const current = dateKeyToDate(appointments[index].date)
    totalGapDays += Math.max(1, Math.round((current.getTime() - previous.getTime()) / 86_400_000))
  }

  return totalGapDays / (appointments.length - 1)
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  if (!year || !month || !day) return new Date(NaN)
  return new Date(year, month - 1, day)
}
