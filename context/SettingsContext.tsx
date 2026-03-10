"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { Settings } from "@/types/Settings"

type SettingsContextValue = {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: Settings = {
  turnDuration: 40,
  breakDuration: 0,
  minAdvanceBooking: 0,
  maxBookingsPerDay: null,
  cancellationMinHours: 24,
  cancellationBlockedMessage:
    "Las cancelaciones fuera de plazo no estan permitidas. Por favor comunicate por WhatsApp con la barberia.",
  whatsappContact: "+5491112345678",
}

const STORAGE_KEY = "barber-settings-v1"

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readSettings())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const value = useMemo<SettingsContextValue>(() => {
    return {
      settings,
      updateSettings: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      resetSettings: () => setSettings(DEFAULT_SETTINGS),
    }
  }, [settings])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error("useSettings must be used inside SettingsProvider")
  return context
}

function readSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_SETTINGS

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      turnDuration: typeof parsed.turnDuration === "number" ? parsed.turnDuration : DEFAULT_SETTINGS.turnDuration,
      breakDuration: typeof parsed.breakDuration === "number" ? parsed.breakDuration : DEFAULT_SETTINGS.breakDuration,
      minAdvanceBooking: typeof parsed.minAdvanceBooking === "number" ? parsed.minAdvanceBooking : DEFAULT_SETTINGS.minAdvanceBooking,
      maxBookingsPerDay: typeof parsed.maxBookingsPerDay === "number" ? parsed.maxBookingsPerDay : null,
      cancellationMinHours:
        typeof parsed.cancellationMinHours === "number"
          ? parsed.cancellationMinHours
          : DEFAULT_SETTINGS.cancellationMinHours,
      cancellationBlockedMessage:
        typeof parsed.cancellationBlockedMessage === "string"
          ? parsed.cancellationBlockedMessage
          : DEFAULT_SETTINGS.cancellationBlockedMessage,
      whatsappContact:
        typeof parsed.whatsappContact === "string"
          ? parsed.whatsappContact
          : DEFAULT_SETTINGS.whatsappContact,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}
