const ARGENTINA_TZ = "America/Argentina/Buenos_Aires"

export function getTodayDateKeyArgentina() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formatter.format(new Date())
}

export function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  if (!year || !month || !day) return new Date(NaN)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`
}

export function formatLongDate(dateKey: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateKeyToDate(dateKey))
}

export function formatShortDateWithDay(dateKey: string) {
  const date = dateKeyToDate(dateKey)
  const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(date)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}/${month}`
}

export function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date)
}

export function isPastDate(dateKey: string) {
  return dateKey < getTodayDateKeyArgentina()
}

export function isSunday(dateKey: string) {
  const date = dateKeyToDate(dateKey)
  return date.getDay() === 0
}

export function addMinutes(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number)
  const total = hours * 60 + minutes + minutesToAdd
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
