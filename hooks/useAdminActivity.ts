"use client"

import { useEffect, useState } from "react"
import type { AdminLogRecord } from "@/lib/admin-logs"

export function useAdminActivity(limit = 12) {
  const [entries, setEntries] = useState<AdminLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    setLoading(true)
    setError("")

    void (async () => {
      try {
        const response = await fetch(`/api/admin/activity?limit=${limit}`, {
          cache: "no-store",
          credentials: "same-origin",
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null
          throw new Error(payload?.message ?? "No se pudo cargar la actividad reciente.")
        }

        const payload = (await response.json()) as { activities?: AdminLogRecord[] }
        if (!active) return
        setEntries(Array.isArray(payload.activities) ? payload.activities : [])
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la actividad reciente.")
        setEntries([])
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [limit])

  return { entries, loading, error }
}
