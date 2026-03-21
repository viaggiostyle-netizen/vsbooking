"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { Settings } from "@/types/Settings"
import {
  DEFAULT_SETTINGS,
  readSettingsStorage,
  syncSettingsFromServer,
  writeSettingsStorage,
} from "@/lib/settings-storage"

type SettingsContextValue = {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readSettingsStorage())

  useEffect(() => {
    writeSettingsStorage(settings)
  }, [settings])

  useEffect(() => {
    let active = true
    void syncSettingsFromServer().then((remote) => {
      if (!active || !remote) return
      setSettings(remote)
    })
    return () => {
      active = false
    }
  }, [])

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
