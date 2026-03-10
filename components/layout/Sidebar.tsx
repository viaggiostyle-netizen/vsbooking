"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  { label: "Hoy",href: "/admin" },
  { label: "Agenda", href: "/admin/agenda" },
  { label: "Ingresos", href: "/admin/ingresos" },
  { label: "Clientes", href: "/admin/clientes" },
  { label: "Horarios", href: "/admin/horarios" },
  { label: "Promociones", href: "/admin/promociones" },
  { label: "Servicios", href: "/admin/servicios" },
  { label: "Reglas", href: "/admin/reglas" },
  { label: "Admins", href: "/admin/admins" },
  { label: "Configuración", href: "/admin/configuracion" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar w-64 border-r border-border bg-card">
      <div className="h-16 border-b border-border px-6 flex items-center">
        <span className="text-lg font-semibold">
          ViaggioStyle
        </span>
      </div>

      <nav className="p-4 space-y-2">
        {items.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                block px-3 py-2 rounded-md text-sm transition-colors
                ${
                  isActive
                    ? "bg-background text-foreground"
                    : "text-muted hover:bg-card hover:text-foreground"
                }
              `}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
