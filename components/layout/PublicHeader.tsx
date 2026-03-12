"use client"

import ThemeToggle from "@/components/layout/ThemeToggle"
import AdminButton from "@/components/AdminButton"

export default function PublicHeader() {
  return (
    <header className="fixed top-0 left-0 z-50 h-14 w-full border-b border-border bg-background text-foreground">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-8">
        <div className="h-9 w-9" aria-hidden />

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AdminButton />
        </div>
      </div>
    </header>
  )
}
