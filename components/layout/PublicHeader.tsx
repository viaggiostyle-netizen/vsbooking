"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import ThemeToggle from "@/components/layout/ThemeToggle"
import { useSession } from "next-auth/react"

export default function PublicHeader() {
  const { status } = useSession()
  const showAdminShortcut = status === "authenticated"

  return (
    <header className="fixed top-0 left-0 z-50 h-14 w-full border-b border-border bg-background text-foreground">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-8">
        <div className="h-9 w-9" aria-hidden />

        <div className="flex items-center gap-4">
          {showAdminShortcut ? (
            <Link
              href="/admin"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-[var(--hover)]"
              aria-label="Ir al panel admin"
            >
              <Settings size={15} />
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
