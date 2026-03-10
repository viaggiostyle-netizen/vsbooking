"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Clock3, Home } from "lucide-react"

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/booking", label: "Turnos", icon: CalendarDays },
  { href: "/manage", label: "Gestionar", icon: Clock3 },
]

const hiddenRoutes = ["/", "/confirmation", "/auth"]

export default function PublicBottomNav() {
  const pathname = usePathname()

  if (hiddenRoutes.some((route) => pathname.startsWith(route))) {
    return null
  }

  return (
    <nav className="public-bottom-nav" aria-label="Navegacion principal">
      <div className="public-bottom-nav-inner">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`public-bottom-nav-item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
