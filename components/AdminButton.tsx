"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Settings } from "lucide-react"
import { useSession } from "next-auth/react"

type AdminCheckResponse = {
  isAdmin?: boolean
}

export default function AdminButton() {
  const { status } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    if (status !== "authenticated") {
      setIsAdmin(false)
      setChecked(true)
      return () => {
        controller.abort()
      }
    }

    void (async () => {
      try {
        const response = await fetch("/api/auth/is-admin", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          if (active) {
            setIsAdmin(false)
            setChecked(true)
          }
          return
        }

        const data = (await response.json()) as AdminCheckResponse
        if (active) {
          setIsAdmin(Boolean(data?.isAdmin))
          setChecked(true)
        }
      } catch {
        if (active) {
          setIsAdmin(false)
          setChecked(true)
        }
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [status])

  if (!checked || !isAdmin) {
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
