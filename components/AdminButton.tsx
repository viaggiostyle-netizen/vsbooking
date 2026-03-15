"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import { useSession } from "next-auth/react"

export default function AdminButton() {
  const { status } = useSession()

  // Dado que NextAuth rechaza el login si no es administrador (en lib/auth/options.ts),
  // cualquier usuario autenticado es, de hecho, administrador.
  // Evitamos llamadas a la API redundantes que puedan filtrar cookies en Safari/móvil.
  if (status !== "authenticated") {
    return null
  }

  return (
    <Link
      href="/admin"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-foreground transition-colors duration-200 hover:bg-[var(--hover)]"
      aria-label="Ir al panel admin"
      title="Panel de administración"
    >
      <Settings size={15} />
    </Link>
  )
}
