"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

export function useWhitelistedAdmin() {
  const { data: session, status } = useSession()
  const [isWhitelistedAdmin, setIsWhitelistedAdmin] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") {
      setIsWhitelistedAdmin(false)
      return
    }

    let active = true

    void (async () => {
      try {
        const response = await fetch("/api/auth/is-admin", {
          cache: "no-store",
          credentials: "include",
        })

        if (!response.ok) throw new Error("No se pudo validar el admin.")

        const payload = (await response.json()) as { isAdmin?: boolean }
        if (active) setIsWhitelistedAdmin(Boolean(payload.isAdmin))
      } catch {
        if (active) setIsWhitelistedAdmin(false)
      }
    })()

    return () => {
      active = false
    }
  }, [status, session?.user?.email])

  return {
    session,
    status,
    isWhitelistedAdmin,
  }
}
