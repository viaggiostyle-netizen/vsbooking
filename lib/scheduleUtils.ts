import { Appointment } from "@/types/Appointment"
import { DateBlock } from "@/types/DateBlock"
import { Settings } from "@/types/Settings"
import { TimeBlock } from "@/types/TimeBlock"
import { WorkBlock } from "@/types/WorkBlock"

type AvailableArgs = {
  date: string
  workBlocks: WorkBlock[]
  settings: Settings
  dateBlocks: DateBlock[]
  timeBlocks: TimeBlock[]
  appointments: Appointment[]
  now?: Date
}

export function generateTimeSlots(date: string, workBlocks: WorkBlock[]): string[] {
  const day = dayOfWeekFromDateKey(date)
  const blocks = workBlocks
    .filter((block) => block.enabled && block.daysOfWeek.includes(day))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const slots: string[] = []

  blocks.forEach((block) => {
    const startHour = Number.parseInt(block.startTime.split(":")[0], 10)
    const endHour = Number.parseInt(block.endTime.split(":")[0], 10)

    for (let hour = startHour; hour <= endHour; hour += 1) {
      const h = String(hour).padStart(2, "0")
      const slot00 = `${h}:00`
      const slot40 = `${h}:40`

      if (slot00 >= block.startTime && slot00 <= block.endTime) slots.push(slot00)
      if (slot40 >= block.startTime && slot40 <= block.endTime) slots.push(slot40)
    }
  })

  return [...new Set(slots)].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
}

export function getAvailableSlots({
  date,
  workBlocks,
  settings,
  dateBlocks,
  timeBlocks,
  appointments,
  now = new Date(),
}: AvailableArgs): string[] {
  if (isDateBlocked(date, dateBlocks)) return []

  const dailyBooked = appointments.filter(
    (appointment) => appointment.date === date && appointment.status !== "cancelled"
  )

  if (
    settings.maxBookingsPerDay !== null &&
    settings.maxBookingsPerDay >= 0 &&
    dailyBooked.length >= settings.maxBookingsPerDay
  ) {
    return []
  }

  const generated = generateTimeSlots(date, workBlocks)

  return generated.filter((slot) => {
    if (isTimeBlocked(date, slot, timeBlocks)) return false
    if (isTimeBooked(date, slot, appointments)) return false
    if (!passesAdvanceWindow(date, slot, now, settings.minAdvanceBooking)) return false
    return true
  })
}

export function isDateBlocked(date: string, dateBlocks: DateBlock[]): boolean {
  return dateBlocks.some((block) => date >= block.startDate && date <= block.endDate)
}

export function isTimeBlocked(date: string, time: string, timeBlocks: TimeBlock[]): boolean {
  return timeBlocks.some((block) => block.date === date && block.time === time)
}

export function isTimeBooked(date: string, time: string, appointments: Appointment[]): boolean {
  return appointments.some(
    (appointment) =>
      appointment.date === date &&
      appointment.time === time &&
      appointment.status !== "cancelled"
  )
}

export function passesAdvanceWindow(date: string, time: string, now: Date, minAdvanceBooking: number): boolean {
  const target = new Date(`${date}T${time}:00`)
  if (Number.isNaN(target.getTime())) return false

  const diffMinutes = (target.getTime() - now.getTime()) / 60000
  return diffMinutes >= minAdvanceBooking
}

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return hour * 60 + minute
}

function dayOfWeekFromDateKey(date: string): number {
  const normalized = new Date(`${date}T00:00:00`)
  return normalized.getDay()
}
