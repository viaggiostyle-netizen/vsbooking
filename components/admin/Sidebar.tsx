"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Logo from "@/components/branding/Logo"

type IconType = ComponentType<{ size?: number; className?: string }>

export type SidebarItem = {
  label: string
  href: string
  icon: IconType
}

export type SidebarSection = {
  id: string
  items: SidebarItem[]
}

type SidebarProps = {
  sections: SidebarSection[]
  activePath: string
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  footer?: ReactNode | ((showLabels: boolean) => ReactNode)
  variant?: "desktop" | "drawer"
}

function isActivePath(current: string, href: string) {
  return current === href || (href !== "/admin" && current.startsWith(`${href}/`))
}

export default function Sidebar({
  sections,
  activePath,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  footer,
  variant = "desktop",
}: SidebarProps) {
  const reduceMotion = useReducedMotion()
  const [hovering, setHovering] = useState(false)
  const isDrawer = variant === "drawer"
  const shouldExpand = !isDrawer && collapsed && hovering
  const showLabels = isDrawer || !collapsed || shouldExpand

  const width = useMemo(() => {
    if (isDrawer) return 280
    if (!collapsed) return 280
    return shouldExpand ? 220 : 86
  }, [collapsed, isDrawer, shouldExpand])

  const baseTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }

  return (
    <motion.aside
      className={`admin-sidebar sidebar flex h-full flex-col border-r border-surface bg-sidebar`}
      data-collapsed={collapsed && !showLabels}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      initial={isDrawer ? false : { x: -24, opacity: 0 }}
      animate={isDrawer ? undefined : { x: 0, opacity: 1, width }}
      style={isDrawer ? undefined : { width }}
      transition={baseTransition}
    >
      <div className="admin-sidebar-header sidebar-divider border-b bg-sidebar">
        <div className="flex h-[72px] items-center gap-3 px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-surface bg-card/40">
              <Logo size={48} className="h-full w-full rounded-full object-cover" />
            </span>
            <span
              className={`flex flex-col transition-all ${showLabels ? "opacity-100" : "opacity-0 max-w-0"}`}
            >
              <span className="text-base font-bold leading-none text-foreground">ViaggioStyle</span>
              <span className="mt-1 text-[11px] font-medium text-muted">Turnos Dashboard</span>
            </span>
          </Link>

          {onToggleCollapse && !isDrawer && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="ml-auto hidden h-9 w-9 items-center justify-center rounded-full border border-surface text-muted transition-colors hover:bg-[var(--hover)] hover:text-foreground lg:inline-flex"
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.id}>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActivePath(activePath, item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className="relative block"
                    aria-current={active ? "page" : undefined}
                  >
                    <motion.div
                      className={`group relative flex min-h-[44px] items-center gap-3 rounded-2xl px-3 py-2 text-[14px] font-semibold transition-colors duration-200 ${
                        active ? "text-[var(--accent)]" : "text-muted hover:text-foreground"
                      }`}
                      whileHover={reduceMotion ? undefined : { x: 3 }}
                      transition={baseTransition}
                    >
                      <span className="relative flex h-8 w-8 items-center justify-center">
                        <AnimatePresence initial={false}>
                          {active && (
                            <motion.span
                              layoutId={`sidebar-pill-${variant}`}
                              className="absolute inset-0 rounded-full bg-[var(--accent)]/16 blur-[6px]"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={baseTransition}
                            />
                          )}
                        </AnimatePresence>
                        <motion.span
                          className={`relative ${active ? "text-[var(--accent)]" : "text-muted"}`}
                          whileHover={reduceMotion ? undefined : { scale: 1.08, rotate: -2 }}
                          transition={baseTransition}
                        >
                          <Icon size={18} />
                        </motion.span>
                      </span>

                      <span
                        className={`truncate transition-all ${
                          showLabels ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
                        }`}
                      >
                        {item.label}
                      </span>

                      {active && (
                        <motion.span
                          layoutId={`sidebar-active-${variant}`}
                          className="pointer-events-none absolute inset-y-1 left-1 right-1 -z-10 rounded-2xl bg-[var(--hover)]"
                          transition={baseTransition}
                        />
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </div>

            {index < sections.length - 1 && (
              <div className="sidebar-divider my-4 -mx-3" aria-hidden="true" />
            )}
          </div>
        ))}
      </nav>

      {footer ? (
        <div className="mt-auto">
          <div className="sidebar-divider" aria-hidden="true" />
          <div className="px-4 pb-4 pt-3">
            {typeof footer === "function" ? footer(showLabels) : footer}
          </div>
        </div>
      ) : null}
    </motion.aside>
  )
}
