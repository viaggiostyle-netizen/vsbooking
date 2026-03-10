import { getSupabaseClient } from "@/lib/supabase/client"
import { generateSlotsFromBlocks } from "@/lib/generateTimeSlots"

type OrganizationHoursRow = {
  start_time: string
  end_time: string
}

export async function getAvailableSlots(date: Date): Promise<string[]> {
  const dayOfWeek = date.getDay()
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("schedules")
    .select("start_time, end_time")
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .order("start_time", { ascending: true })

  let rows = data as OrganizationHoursRow[] | null

  if (error) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("organization_hours")
      .select("start_time, end_time")
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .order("start_time", { ascending: true })

    if (legacyError) throw legacyError
    rows = legacyData as OrganizationHoursRow[] | null
  }

  if (!rows?.length) return []

  const blocks = rows
    .map((row) => {
      const start = Number.parseInt(row.start_time.slice(0, 2), 10)
      const end = Number.parseInt(row.end_time.slice(0, 2), 10)
      return { start, end }
    })
    .filter((block) => Number.isFinite(block.start) && Number.isFinite(block.end))

  return generateSlotsFromBlocks(blocks)
}
