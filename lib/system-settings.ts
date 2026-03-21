import { DEFAULT_SETTINGS } from "@/lib/settings-storage"

type SystemSettingKey =
  | "appointment_cancellation_hours"
  | "appointment_cancellation_message"
  | "appointment_whatsapp_contact"

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

export type CancellationSettings = {
  hours: number
  blockedMessage: string
  whatsappContact: string
}

export async function getCancellationSettings(): Promise<CancellationSettings> {
  try {
    const [hoursValue, blockedMessageValue, whatsappContactValue] = await Promise.all([
      fetchSystemSetting("appointment_cancellation_hours"),
      fetchSystemSetting("appointment_cancellation_message"),
      fetchSystemSetting("appointment_whatsapp_contact"),
    ])

    const parsedHours = Number(hoursValue)

    return {
      hours:
        Number.isFinite(parsedHours) && parsedHours > 0
          ? Math.floor(parsedHours)
          : DEFAULT_SETTINGS.cancellationMinHours,
      blockedMessage:
        blockedMessageValue?.trim() || DEFAULT_SETTINGS.cancellationBlockedMessage,
      whatsappContact:
        whatsappContactValue?.trim() || DEFAULT_SETTINGS.whatsappContact,
    }
  } catch (error) {
    console.error("Failed to read cancellation settings", error)
    return {
      hours: DEFAULT_SETTINGS.cancellationMinHours,
      blockedMessage: DEFAULT_SETTINGS.cancellationBlockedMessage,
      whatsappContact: DEFAULT_SETTINGS.whatsappContact,
    }
  }
}

export async function setCancellationSettings(settings: CancellationSettings): Promise<void> {
  const hours =
    Number.isFinite(settings.hours) && settings.hours > 0
      ? Math.floor(settings.hours)
      : DEFAULT_SETTINGS.cancellationMinHours
  const blockedMessage =
    settings.blockedMessage.trim() || DEFAULT_SETTINGS.cancellationBlockedMessage
  const whatsappContact =
    settings.whatsappContact.trim() || DEFAULT_SETTINGS.whatsappContact

  try {
    await Promise.all([
      upsertSystemSetting("appointment_cancellation_hours", String(hours)),
      upsertSystemSetting("appointment_cancellation_message", blockedMessage),
      upsertSystemSetting("appointment_whatsapp_contact", whatsappContact),
    ])
  } catch (error) {
    console.error("Failed to write cancellation settings", error)
  }
}

export async function getAppointmentCancellationHours(): Promise<number> {
  const settings = await getCancellationSettings()
  return settings.hours
}

export async function setAppointmentCancellationHours(hours: number): Promise<void> {
  const current = await getCancellationSettings()
  await setCancellationSettings({
    ...current,
    hours,
  })
}
