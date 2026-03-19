"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Settings } from "lucide-react"
import { useSession } from "next-auth/react"

export default function AdminButton() {
  const { status } = useSession()
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    if (status !== "authenticated") {
      setIsAuthorizedAdmin(false)
      return () => {
        controller.abort()
      }
    }

    void (async () => {
      try {
        const response = await fetch("/api/auth/is-admin", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("No se pudo validar el admin autenticado.")
        }

        const payload = (await response.json()) as { isAdmin?: boolean }
        setIsAuthorizedAdmin(Boolean(payload.isAdmin))
      } catch {
        if (!controller.signal.aborted) {
          setIsAuthorizedAdmin(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [status])

  if (!isAuthorizedAdmin) {
    return null
  }

  return (
    <Link
      href="/admin"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-foreground transition-colors duration-200 hover:bg-[var(--hover)]"
      aria-label="Ir al panel admin"
      title="Panel de administracion"
    >
      <Settings size={15} />
    </Link>
  )
}
