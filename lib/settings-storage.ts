import type { Settings } from "@/types/Settings"

export const SETTINGS_STORAGE_KEY = "barber-settings-v1"

export const DEFAULT_SETTINGS: Settings = {
  turnDuration: 40,
  breakDuration: 0,
  minAdvanceBooking: 0,
  maxBookingsPerDay: null,
  cancellationMinHours: 24,
  cancellationBlockedMessage:
    "Las cancelaciones fuera de plazo no estan permitidas. Por favor comunicate por WhatsApp con la barberia.",
  whatsappContact: "+5491112345678",
}

export type CancellationSettingsPayload = {
  hours?: unknown
  blockedMessage?: unknown
  whatsappContact?: unknown
}

export function normalizeSettings(input?: Partial<Settings> | null): Settings {
  return {
    turnDuration:
      typeof input?.turnDuration === "number"
        ? input.turnDuration
        : DEFAULT_SETTINGS.turnDuration,
    breakDuration:
      typeof input?.breakDuration === "number"
        ? input.breakDuration
        : DEFAULT_SETTINGS.breakDuration,
    minAdvanceBooking:
      typeof input?.minAdvanceBooking === "number"
        ? input.minAdvanceBooking
        : DEFAULT_SETTINGS.minAdvanceBooking,
    maxBookingsPerDay:
      typeof input?.maxBookingsPerDay === "number" ? input.maxBookingsPerDay : null,
    cancellationMinHours:
      typeof input?.cancellationMinHours === "number" && input.cancellationMinHours > 0
        ? Math.floor(input.cancellationMinHours)
        : DEFAULT_SETTINGS.cancellationMinHours,
    cancellationBlockedMessage:
      typeof input?.cancellationBlockedMessage === "string" &&
      input.cancellationBlockedMessage.trim()
        ? input.cancellationBlockedMessage.trim()
        : DEFAULT_SETTINGS.cancellationBlockedMessage,
    whatsappContact:
      typeof input?.whatsappContact === "string" && input.whatsappContact.trim()
        ? input.whatsappContact.trim()
        : DEFAULT_SETTINGS.whatsappContact,
  }
}

export function readSettingsStorage(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS

  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) return DEFAULT_SETTINGS

  try {
    return normalizeSettings(JSON.parse(raw) as Partial<Settings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettingsStorage(settings: Settings) {
  if (typeof window === "undefined") return
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)))
}

export function normalizeCancellationSettingsPayload(
  payload: CancellationSettingsPayload | null | undefined
): Partial<Settings> {
  const patch: Partial<Settings> = {}

  const hours = Number(payload?.hours)
  if (Number.isFinite(hours) && hours > 0) {
    patch.cancellationMinHours = Math.floor(hours)
  }

  if (typeof payload?.blockedMessage === "string" && payload.blockedMessage.trim()) {
    patch.cancellationBlockedMessage = payload.blockedMessage.trim()
  }

  if (typeof payload?.whatsappContact === "string" && payload.whatsappContact.trim()) {
    patch.whatsappContact = payload.whatsappContact.trim()
  }

  return patch
}

export async function syncSettingsFromServer(): Promise<Settings | null> {
  if (typeof window === "undefined") return null

  try {
    const response = await fetch("/api/settings/cancellation", { cache: "no-store" })
    if (!response.ok) return null

    const payload = (await response.json()) as CancellationSettingsPayload
    const current = readSettingsStorage()
    const remote = normalizeCancellationSettingsPayload(payload)

    const next = normalizeSettings({
      ...current,
      cancellationMinHours:
        remote.cancellationMinHours === undefined
          ? current.cancellationMinHours
          : remote.cancellationMinHours === DEFAULT_SETTINGS.cancellationMinHours &&
              current.cancellationMinHours !== DEFAULT_SETTINGS.cancellationMinHours
            ? current.cancellationMinHours
            : remote.cancellationMinHours,
      cancellationBlockedMessage:
        remote.cancellationBlockedMessage === undefined
          ? current.cancellationBlockedMessage
          : remote.cancellationBlockedMessage === DEFAULT_SETTINGS.cancellationBlockedMessage &&
              current.cancellationBlockedMessage !== DEFAULT_SETTINGS.cancellationBlockedMessage
            ? current.cancellationBlockedMessage
            : remote.cancellationBlockedMessage,
      whatsappContact:
        remote.whatsappContact === undefined
          ? current.whatsappContact
          : remote.whatsappContact === DEFAULT_SETTINGS.whatsappContact &&
              current.whatsappContact !== DEFAULT_SETTINGS.whatsappContact
            ? current.whatsappContact
            : remote.whatsappContact,
    })
    writeSettingsStorage(next)
    return next
  } catch {
    return null
  }
}
