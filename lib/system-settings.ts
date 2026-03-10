type SystemSettingKey = "appointment_cancellation_hours"

type SystemSettingRow = {
  id: string
  setting_key: string
  setting_value: string | null
}

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function readSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return {
    supabaseUrl: normalizeBaseUrl(supabaseUrl),
    serviceRoleKey,
  }
}

async function fetchSystemSetting(key: SystemSettingKey): Promise<string | null> {
  const config = readSupabaseConfig()
  if (!config) return null

  const { supabaseUrl, serviceRoleKey } = config

  const url = `${supabaseUrl}/rest/v1/system_settings?select=id,setting_key,setting_value&setting_key=eq.${encodeURIComponent(
    key
  )}&limit=1`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    console.error("Failed to read system setting", key, response.status, errorText)
    return null
  }

  const rows = (await response.json().catch(() => null)) as SystemSettingRow[] | null
  if (!rows || rows.length === 0) return null

  return rows[0]?.setting_value ?? null
}

async function upsertSystemSetting(key: SystemSettingKey, value: string): Promise<void> {
  const config = readSupabaseConfig()
  if (!config) return

  const { supabaseUrl, serviceRoleKey } = config

  const response = await fetch(`${supabaseUrl}/rest/v1/system_settings`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([{ setting_key: key, setting_value: value }]),
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    console.error("Failed to write system setting", key, response.status, errorText)
  }
}

export async function getAppointmentCancellationHours(): Promise<number> {
  try {
    const value = await fetchSystemSetting("appointment_cancellation_hours")
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return 3
    return Math.floor(parsed)
  } catch (error) {
    console.error("Failed to read appointment cancellation hours", error)
    return 3
  }
}

export async function setAppointmentCancellationHours(hours: number): Promise<void> {
  const safe = Number.isFinite(hours) && hours > 0 ? Math.floor(hours) : 3
  try {
    await upsertSystemSetting("appointment_cancellation_hours", String(safe))
  } catch (error) {
    console.error("Failed to write appointment cancellation hours", error)
  }
}

