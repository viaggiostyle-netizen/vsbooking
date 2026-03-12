import { timeToMinutes } from "@/lib/scheduleUtils"
import { addMinutes } from "@/lib/date"
import type { Appointment } from "@/types/Appointment"
import type { OrganizationState } from "@/types/organization"

type AvailabilityArgs = {
  date: string
  duration: number
  organization: OrganizationState
  appointments: Appointment[]
  now?: Date
  ignoreAppointmentId?: string
}

export function getAvailableTimeSlots({
  date,
  duration,
  organization,
  appointments,
  now = new Date(),
  ignoreAppointmentId,
}: AvailabilityArgs): string[] {
  if (duration <= 0) return []
  if (organization.manualDateBlocks.some((item) => date >= item.startDate && date <= item.endDate)) return []

  const weekday = new Date(`${date}T00:00:00`).getDay()
  if (weekday === 0) return []

  const dayBlocks = organization.recurringBlocks
    .filter((block) => block.enabled && block.daysOfWeek.includes(weekday))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const generated = new Set<string>()
  dayBlocks.forEach((block) => {
    const startHour = Number.parseInt(block.startTime.split(":")[0], 10)
    const endHour = Number.parseInt(block.endTime.split(":")[0], 10)

    for (let hour = startHour; hour <= endHour; hour += 1) {
      const h = String(hour).padStart(2, "0")
      const slot00 = `${h}:00`
      const slot40 = `${h}:40`

      if (slot00 >= block.startTime && slot00 <= block.endTime) {
        generated.add(slot00)
      }
      if (slot40 >= block.startTime && slot40 <= block.endTime) {
        generated.add(slot40)
      }
    }
  })

  const ordered = [...generated].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))

  return ordered.filter((start) => {
    if (
      organization.manualTimeBlocks.some((item) => item.date === date && item.time === start)
    ) {
      return false
    }
    if (!passesAdvanceWindow(date, start, now, organization.settings.minAdvanceBooking)) {
      return false
    }
    return !hasOverlappingAppointment(start, date, appointments, ignoreAppointmentId)
  })
}

export type SlotStatus = "available" | "blocked" | "booked" | "past_due"

export type AnnotatedSlot = {
  time: string
  status: SlotStatus
}

export function getAnnotatedSlots({
  date,
  duration,
  organization,
  appointments,
  now = new Date(),
}: AvailabilityArgs): AnnotatedSlot[] {
  if (duration <= 0) return []
  if (organization.manualDateBlocks.some((item) => date >= item.startDate && date <= item.endDate)) return []

  const weekday = new Date(`${date}T00:00:00`).getDay()
  if (weekday === 0) return []

  const dayBlocks = organization.recurringBlocks
    .filter((block) => block.enabled && block.daysOfWeek.includes(weekday))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const generated = new Set<string>()
  dayBlocks.forEach((block) => {
    const startHour = Number.parseInt(block.startTime.split(":")[0], 10)
    const endHour = Number.parseInt(block.endTime.split(":")[0], 10)

    for (let hour = startHour; hour <= endHour; hour += 1) {
      const h = String(hour).padStart(2, "0")
      const slot00 = `${h}:00`
      const slot40 = `${h}:40`

      if (slot00 >= block.startTime && slot00 <= block.endTime) generated.add(slot00)
      if (slot40 >= block.startTime && slot40 <= block.endTime) generated.add(slot40)
    }
  })

  const ordered = [...generated].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))

  return ordered.map((time) => {
    if (organization.manualTimeBlocks.some((item) => item.date === date && item.time === time)) {
      return { time, status: "blocked" as SlotStatus }
    }
    if (!passesAdvanceWindow(date, time, now, organization.settings.minAdvanceBooking)) {
      return { time, status: "past_due" as SlotStatus }
    }
    if (hasOverlappingAppointment(time, date, appointments)) {
      return { time, status: "booked" as SlotStatus }
    }
    return { time, status: "available" as SlotStatus }
  })
}

function passesAdvanceWindow(date: string, time: string, now: Date, minAdvanceBooking: number): boolean {
  const target = new Date(`${date}T${time}:00`)
  if (Number.isNaN(target.getTime())) return false
  return (target.getTime() - now.getTime()) / 60000 >= minAdvanceBooking
}

function hasOverlappingAppointment(
  start: string,
  date: string,
  appointments: Appointment[],
  ignoreAppointmentId?: string
) {
  return appointments.some((appointment) => {
    if (appointment.id === ignoreAppointmentId) return false
    if (appointment.status === "cancelled") return false
    if (appointment.date !== date) return false
    return appointment.time === start
  })
}

export function buildConsecutiveTimes(startTime: string, durations: number[]) {
  const times: string[] = []
  let cursor = startTime

  durations.forEach((duration) => {
    times.push(cursor)
    cursor = addMinutes(cursor, duration)
  })

  return times
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}
