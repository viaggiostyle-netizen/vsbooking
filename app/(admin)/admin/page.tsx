"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  EyeOff,
  MessageCircle,
  Pencil,
  Trash2,
  UserX,
} from "lucide-react"
import AdminActivityFeed from "@/components/admin/AdminActivityFeed"
import DashboardCards from "@/components/admin/DashboardCards"
import { useAppointments } from "@/context/AppointmentContext"
import { useAdminActivity } from "@/hooks/useAdminActivity"
import { useHasMounted } from "@/hooks/useHasMounted"
import { updateAppointmentStatus as persistAppointmentStatus } from "@/lib/appointments"
import { toCanonicalAppointmentStatus } from "@/lib/appointment-status"
import { fetchAppointments } from "@/lib/fetchAppointments"
import { patchAppointmentInSupabase } from "@/lib/supabase/appointments"
import type { Appointment, AppointmentStatus } from "@/types/Appointment"

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires"
const MANAGE_URL = "https://vsbooking-chi.vercel.app/manage"

export default function AdminPage() {
  const {
    appointments,
    setAppointments,
    setAppointmentStatus,
    updateAppointment,
    deleteAppointment,
  } = useAppointments()
  const activity = useAdminActivity(5)
  const hasMounted = useHasMounted()

  const [editing, setEditing] = useState<Appointment | null>(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [isSavingAction, setIsSavingAction] = useState(false)
  const [actionError, setActionError] = useState("")

  const todayKey = useMemo(() => getTodayDateKeyInArgentina(), [])
  const todayAppointments = useMemo(
    () => appointments.filter((item) => item.date === todayKey),
    [appointments, todayKey]
  )

  const pendingTurns = useMemo(
    () =>
      todayAppointments
        .filter((item) => toCanonicalAppointmentStatus(item.status) === "pending")
        .sort(byTimeAsc),
    [todayAppointments]
  )

  const completedTurns = useMemo(
    () =>
      todayAppointments.filter(
        (item) => toCanonicalAppointmentStatus(item.status) === "completed"
      ),
    [todayAppointments]
  )

  const totalEstimated = useMemo(
    () => todayAppointments.reduce((sum, item) => sum + item.price, 0),
    [todayAppointments]
  )

  const statCards = useMemo(
    () => [
      {
        id: "turnos-hoy",
        title: "Turnos hoy",
        value: String(todayAppointments.length),
        subtitle: `${pendingTurns.length} pendientes`,
        icon: <CalendarDays size={16} />,
      },
      {
        id: "completados",
        title: "Completados",
        value: String(completedTurns.length),
        subtitle: formatMoney(completedTurns.reduce((sum, item) => sum + item.price, 0)),
        icon: <CheckCircle2 size={16} className="text-emerald-400" />,
      },
      {
        id: "total-estimado",
        title: "Total estimado",
        value: formatMoney(totalEstimated),
        subtitle: "del dia",
        icon: <span className="text-sm">$</span>,
      },
      {
        id: "proximo-turno",
        title: "Proximo turno",
        value: pendingTurns[0]?.time ?? "-",
        subtitle: pendingTurns[0]?.clientName ?? "Sin turnos",
        icon: <Clock3 size={16} />,
      },
    ],
    [completedTurns, pendingTurns, todayAppointments.length, totalEstimated]
  )

  const loadAppointments = useCallback(async () => {
    try {
      const rows = await fetchAppointments()
      setAppointments(rows)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("AdminPage: Fallo al cargar los turnos:", message)
    }
  }, [setAppointments])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  const openEdit = (appointment: Appointment) => {
    if (isSavingAction) return
    setActionError("")
    setEditing(appointment)
    setEditName(appointment.clientName)
    setEditPhone(appointment.clientPhone)
  }

  const saveEdit = async () => {
    if (!editing || isSavingAction) return

    const patch = {
      clientName: editName.trim() || editing.clientName,
      clientPhone: editPhone.trim() || editing.clientPhone,
    }
    const rollbackPatch = {
      clientName: editing.clientName,
      clientPhone: editing.clientPhone,
    }

    setIsSavingAction(true)
    setActionError("")
    updateAppointment(editing.id, patch)

    try {
      const updated = await patchAppointmentInSupabase(editing.id, patch)
      if (!updated) throw new Error("No se pudo actualizar el turno")
      await loadAppointments()
      setEditing(null)
    } catch {
      updateAppointment(editing.id, rollbackPatch)
      setActionError("No se pudo guardar la edicion. Reintenta en unos segundos.")
    } finally {
      setIsSavingAction(false)
    }
  }

  const handleStatusChange = async (
    appointment: Appointment,
    status: AppointmentStatus
  ) => {
    if (isSavingAction) return

    const previousStatus = appointment.status
    setIsSavingAction(true)
    setActionError("")
    setAppointmentStatus(appointment.id, status)

    try {
      await persistAppointmentStatus(appointment.id, status)
      await loadAppointments()
    } catch {
      setAppointmentStatus(appointment.id, previousStatus)
      setActionError("No se pudo actualizar el estado del turno.")
    } finally {
      setIsSavingAction(false)
    }
  }

  const handleDelete = async (appointmentId: string) => {
    if (isSavingAction) return

    setIsSavingAction(true)
    setActionError("")

    try {
      const deleted = await deleteAppointment(appointmentId)
      if (!deleted) throw new Error("No se pudo eliminar el turno")
      await loadAppointments()
    } catch {
      setActionError("No se pudo eliminar el turno.")
    } finally {
      setIsSavingAction(false)
    }
  }

  if (!hasMounted) {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 text-center">
        <p className="animate-pulse italic text-muted">Sincronizando agenda...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
          Resumen
        </p>
        <h1 className="mt-1 text-[30px] font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Vista diaria de turnos y acciones rapidas.
        </p>
      </header>

      <DashboardCards cards={statCards} />

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={16} />
          <h2 className="text-[20px] font-semibold">Actividad reciente</h2>
        </div>

        <AdminActivityFeed
          entries={activity.entries}
          loading={activity.loading}
          error={activity.error}
          compact
          showHeader={false}
          showViewAllLink
          emptyMessage="Aun no hay registros administrativos para mostrar."
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={16} />
          <h2 className="text-[20px] font-semibold">Turnos pendientes</h2>
        </div>

        <div className="space-y-3">
          {actionError ? <p className="text-sm text-red-400">{actionError}</p> : null}
          {pendingTurns.length === 0 ? (
            <div className="card flex min-h-[140px] items-center justify-center rounded-2xl border border-surface bg-surface p-6">
              <p className="text-sm text-muted">No hay turnos pendientes para hoy</p>
            </div>
          ) : (
            pendingTurns.map((turn) => (
              <PendingTurnRow
                key={turn.id}
                appointment={turn}
                disabled={isSavingAction}
                onStatusChange={(status) => void handleStatusChange(turn, status)}
                onDelete={() => void handleDelete(turn.id)}
                onEdit={() => openEdit(turn)}
              />
            ))
          )}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[16px]">
          <div className="glass-card w-full max-w-[460px] p-6">
            <h3 className="mb-3 text-lg font-semibold">Editar turno</h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">Nombre</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-12 w-full rounded-full border border-surface bg-transparent px-4 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Telefono</label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-12 w-full rounded-full border border-surface bg-transparent px-4 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="button-secondary h-10 px-5 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={isSavingAction}
                className="button-primary h-10 !w-auto !mt-0 px-5 text-sm disabled:opacity-60"
              >
                {isSavingAction ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function PendingTurnRow({
  appointment,
  disabled,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  appointment: Appointment
  disabled: boolean
  onStatusChange: (status: AppointmentStatus) => void
  onDelete: () => void
  onEdit: () => void
}) {
  const phone = normalizePhoneForWa(appointment.clientPhone)
  const whatsappMessage = buildWhatsappMessage(appointment)

  return (
    <article className="card group relative overflow-hidden rounded-[26px] border border-surface bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card)_96%,transparent),color-mix(in_srgb,var(--background)_88%,transparent))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:bg-card/40">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="text-[18px] font-bold tracking-tight text-foreground">
              {appointment.time}
            </p>
            <p className="text-[18px] font-semibold tracking-tight text-foreground">
              {appointment.clientName}
            </p>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-[var(--accent)]">
              Pendiente
            </span>
          </div>
          <p className="mt-1 text-[14px] font-medium text-muted">
            {appointment.service} &nbsp;
            <span className="font-bold text-foreground/90">
              {formatMoney(appointment.price)}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3">
          <a
            href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noreferrer"
            className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-surface bg-card/60 px-4 text-[13px] font-bold text-foreground transition-all hover:bg-card md:col-auto md:h-9 md:rounded-2xl md:px-3 md:font-medium"
          >
            <MessageCircle size={15} className="text-emerald-400" />
            <span>WhatsApp</span>
          </a>

          <DashboardAction
            label="Completar"
            disabled={disabled}
            onClick={() => onStatusChange("completed")}
            icon={<CheckCircle2 size={16} className="text-emerald-400" />}
          />
          <DashboardAction
            label="Aviso"
            disabled={disabled}
            onClick={() => onStatusChange("no_vino_aviso")}
            icon={<UserX size={16} className="text-orange-500" />}
          />
          <DashboardAction
            label="No-show"
            disabled={disabled}
            onClick={() => onStatusChange("no_vino_no_aviso")}
            icon={<EyeOff size={16} className="text-rose-400" />}
          />

          <div className="col-span-2 flex gap-2 md:col-auto md:gap-1.5">
            <DashboardAction
              label="Editar"
              disabled={disabled}
              onClick={onEdit}
              icon={<Pencil size={15} />}
              compact
            />
            <DashboardAction
              label="Eliminar"
              disabled={disabled}
              onClick={onDelete}
              icon={<Trash2 size={15} className="text-red-500" />}
              compact
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function DashboardAction({
  label,
  disabled,
  onClick,
  icon,
  compact = false,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  compact?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2.5 rounded-xl border border-surface bg-card/60 px-3 transition-all active:scale-[0.98] hover:bg-card disabled:cursor-not-allowed disabled:opacity-55 md:h-9 md:w-9 md:rounded-full md:p-0 ${compact ? "flex-1 md:flex-none" : ""}`}
      title={label}
    >
      {icon}
      <span className="text-[13px] font-bold text-foreground md:hidden">{label}</span>
    </button>
  )
}

function getTodayDateKeyInArgentina() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formatter.format(new Date())
}

function byTimeAsc(a: Appointment, b: Appointment) {
  return a.time.localeCompare(b.time)
}

function normalizePhoneForWa(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""

  let normalized = digits
  while (normalized.startsWith("549549")) {
    normalized = normalized.slice(3)
  }

  return normalized
}

function buildWhatsappMessage(appointment: Appointment) {
  const dateLabel = formatDateForMessage(appointment.date)

  return [
    "Buenas! Te hablo desde ViaggioStyle, te queria recordar que agendaste una cita. Abajo te dejo los detalles para que no te olvides.",
    "",
    `Fecha: ${dateLabel}`,
    `Hora: ${appointment.time}`,
    `Servicio: ${appointment.service}`,
    "",
    `Total a pagar: ${formatMoney(appointment.price)}`,
    "",
    `Si surge algun inconveniente o la queres cancelar o modificar, porfavor ingresa a "${MANAGE_URL}". Ahi podras modificar y/o cancelar tu cita. Cualquier cosa tambien me podes mandar a mi!`,
    "",
    "Saludos, te espero!",
  ].join("\n")
}

function formatDateForMessage(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value
  }

  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatMoney(value: number) {
  return `$ ${value.toLocaleString("es-AR")}`
}
