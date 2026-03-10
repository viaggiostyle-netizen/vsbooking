import { getAvailableSlots } from "@/lib/getAvailableSlots"
import { getSupabaseClient } from "@/lib/supabase/client"

type TimeRow = { time: string }

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export async function getFreeSlots(date: Date): Promise<string[]> {
  const allSlots = await getAvailableSlots(date)
  if (allSlots.length === 0) return []

  const supabase = getSupabaseClient()
  if (!supabase) return allSlots

  const dateStr = toDateKey(date)

  let bookedTimes: string[] = []

  // Intenta en 'bookings' q es la q tiene el cliente
  const { data: bookingRows, error: bookingsError } = await supabase
    .from("bookings")
    .select("time")
    .eq("date", dateStr)
    .neq("status", "cancelled")

  if (!bookingsError) {
    bookedTimes = ((bookingRows ?? []) as TimeRow[]).map((item) => item.time.slice(0, 5))
  } else {
    // Fallback a 'appointments'
    const { data: appointmentRows, error: appointmentsError } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", dateStr)
      .neq("status", "cancelled")

    if (appointmentsError) throw appointmentsError
    bookedTimes = ((appointmentRows ?? []) as Array<{ appointment_time: string }>).map((item) =>
      item.appointment_time.slice(0, 5)
    )
  }

  return allSlots.filter((slot) => !bookedTimes.includes(slot))
}
