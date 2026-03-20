"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import {
  Activity,
  CalendarPlus,
  CircleSlash2,
  PencilLine,
  ShieldCheck,
  ShieldMinus,
  Settings2,
  Trash2,
} from "lucide-react"
import type { AdminLogAction, AdminLogRecord } from "@/lib/admin-logs"

type ActivityFeedProps = {
  entries: AdminLogRecord[]
  loading: boolean
  error?: string
  compact?: boolean
  showHeader?: boolean
  showViewAllLink?: boolean
  emptyMessage?: string
}

type ActivityMeta = {
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  toneClassName: string
}

const ACTION_META: Record<AdminLogAction, ActivityMeta> = {
  admin_added: {
    label: "Admin agregado",
    icon: ShieldCheck,
    toneClassName: "bg-emerald-500/12 text-emerald-500 border-emerald-500/20",
  },
  admin_removed: {
    label: "Admin eliminado",
    icon: ShieldMinus,
    toneClassName: "bg-rose-500/12 text-rose-500 border-rose-500/20",
  },
  appointment_created: {
    label: "Turno creado",
    icon: CalendarPlus,
    toneClassName: "bg-sky-500/12 text-sky-500 border-sky-500/20",
  },
  appointment_updated: {
    label: "Turno editado",
    icon: PencilLine,
    toneClassName: "bg-amber-500/12 text-amber-500 border-amber-500/20",
  },
  appointment_status_updated: {
    label: "Estado de turno",
    icon: Activity,
    toneClassName: "bg-violet-500/12 text-violet-500 border-violet-500/20",
  },
  appointment_deleted: {
    label: "Turno eliminado",
    icon: Trash2,
    toneClassName: "bg-rose-500/12 text-rose-500 border-rose-500/20",
  },
  organization_updated: {
    label: "Configuracion general",
    icon: Settings2,
    toneClassName: "bg-blue-500/12 text-blue-500 border-blue-500/20",
  },
  cancellation_policy_updated: {
    label: "Reglas de cancelacion",
    icon: CircleSlash2,
    toneClassName: "bg-orange-500/12 text-orange-500 border-orange-500/20",
  },
}

export default function AdminActivityFeed({
  entries,
  loading,
  error,
  compact = false,
  showHeader = true,
  showViewAllLink = false,
  emptyMessage = "Todavia no hay acciones registradas.",
}: ActivityFeedProps) {
  const topSpacingClass = showHeader || showViewAllLink ? "mt-4" : ""

  return (
    <section className={`admin-panel ${compact ? "p-5" : "p-6"}`}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Auditoria</p>
            <h2 className={`${compact ? "mt-1 text-lg" : "mt-1 text-2xl"} font-bold tracking-tight`}>
              Actividad reciente
            </h2>
          </div>

          {showViewAllLink ? (
            <Link
              href="/admin/actividad"
              className="inline-flex h-10 items-center rounded-xl border border-border/40 px-3 text-sm font-semibold text-muted transition-colors duration-200 ease-out hover:bg-card hover:text-foreground"
            >
              Ver todo
            </Link>
          ) : null}
        </div>
      ) : showViewAllLink ? (
        <div className="mb-4 flex justify-end">
          <Link
            href="/admin/actividad"
            className="inline-flex h-10 items-center rounded-xl border border-border/40 px-3 text-sm font-semibold text-muted transition-colors duration-200 ease-out hover:bg-card hover:text-foreground"
          >
            Ver todo
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className={`${topSpacingClass} space-y-3`}>
          {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
            <div
              key={`activity-skeleton-${index}`}
              className="flex items-start gap-3 rounded-2xl border border-border/30 bg-card/40 px-4 py-3"
            >
              <div className="h-10 w-10 animate-pulse rounded-2xl bg-card" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded-full bg-card" />
                <div className="h-4 w-full animate-pulse rounded-full bg-card" />
                <div className="h-3 w-40 animate-pulse rounded-full bg-card" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={`${topSpacingClass} rounded-2xl border border-rose-500/20 bg-rose-500/8 px-4 py-4 text-sm font-medium text-rose-500`}>
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className={`${topSpacingClass} rounded-2xl border border-border/30 bg-card/40 px-4 py-8 text-sm text-muted`}>
          {emptyMessage}
        </div>
      ) : (
        <div className={`${topSpacingClass} space-y-3`}>
          {entries.map((entry, index) => {
            const meta = ACTION_META[entry.action]
            const Icon = meta.icon

            return (
              <article
                key={`${entry.createdAt}-${entry.actorEmail}-${entry.action}-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-border/35 bg-card/45 px-4 py-3"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${meta.toneClassName}`}
                >
                  <Icon size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-foreground/85">
                    {entry.targetLabel || "Sin detalle adicional."}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {entry.actorEmail} | {formatAbsoluteDate(entry.createdAt)}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function formatAbsoluteDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Reciente"

  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / (60 * 1000))
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute")
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour")
  }

  const diffDays = Math.round(diffHours / 24)
  return rtf.format(diffDays, "day")
}
