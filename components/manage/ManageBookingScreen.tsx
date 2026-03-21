"use client"

import Link from "next/link"
import { ArrowLeft, CalendarDays, Clock, Mail, Scissors } from "lucide-react"
import { useMemo, useState } from "react"
import BookingSearch from "@/components/manage/BookingSearch"
import BookingDetails from "@/components/manage/BookingDetails"
import DatePicker from "@/components/booking/DatePicker"
import TimePicker from "@/components/booking/TimePicker"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import { getAvailableTimeSlots } from "@/lib/availability"
import { evaluateCancellationRule } from "@/lib/rulesUtils"
import { getTodayDateKeyArgentina, isPastDate, isSunday } from "@/lib/date"
import { useAppointmentsStore } from "@/stores/useAppointmentsStore"
import { useOrganizationStore } from "@/stores/useOrganizationStore"

export default function ManageBookingScreen() {
  const [email, setEmail] = useState("")
  const [searched, setSearched] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [modifyDate, setModifyDate] = useState(getTodayDateKeyArgentina())
  const [modifyTime, setModifyTime] = useState("")
  const [error, setError] = useState<{ message: string; whatsappUrl: string } | null>(null)
  const [targetAppointmentId, setTargetAppointmentId] = useState<string | null>(null)

  const appointments = useAppointmentsStore((state) => state.appointments)
  const findByEmail = useAppointmentsStore((state) => state.findByEmail)
  const cancelAppointment = useAppointmentsStore((state) => state.cancelAppointment)
  const modifyAppointment = useAppointmentsStore((state) => state.modifyAppointment)
  const organization = useOrganizationStore()

  const found = useMemo(
    () => (searched ? findByEmail(email).filter((item) => item.status !== "cancelled") : []),
    [searched, findByEmail, email]
  )
  const selected = found.find((item) => item.id === targetAppointmentId) ?? null

  const availableSlots = useMemo(() => {
    if (!selected) return []
    return getAvailableTimeSlots({
      date: modifyDate,
      duration: selected.durationMin,
      organization,
      appointments,
      ignoreAppointmentId: selected.id,
    })
  }, [selected, modifyDate, organization, appointments])

  const search = () => {
    setSearched(true)
    setTargetAppointmentId(null)
    setEditing(false)
  }

  const openCancel = (appointment: (typeof found)[number]) => {
    setTargetAppointmentId(appointment.id)
    const result = evaluateCancellationRule(appointment.date, appointment.time, organization.settings)

    if (!result.allowed) {
      setError({
        message: result.message ?? "No puedes cancelar este turno.",
        whatsappUrl: result.whatsappUrl,
      })
      return
    }

    setError(null)
    setCancelModal(true)
  }

  const confirmCancel = () => {
    if (!selected) return
    cancelAppointment(selected.id)
    setCancelModal(false)
    setSearched(false)
  }

  const openModify = (appointment: (typeof found)[number]) => {
    setTargetAppointmentId(appointment.id)
    const result = evaluateCancellationRule(appointment.date, appointment.time, organization.settings)

    if (!result.allowed) {
      setError({
        message: result.message ?? "No puedes modificar este turno.",
        whatsappUrl: result.whatsappUrl,
      })
      setEditing(false)
      return
    }

    setModifyDate(appointment.date)
    setModifyTime("")
    setError(null)
    setEditing(true)
  }

  const confirmModify = () => {
    if (!selected || !modifyDate || !modifyTime) return
    const result = evaluateCancellationRule(selected.date, selected.time, organization.settings)
    if (!result.allowed) {
      setError({
        message: result.message ?? "No puedes modificar este turno.",
        whatsappUrl: result.whatsappUrl,
      })
      setEditing(false)
      return
    }
    modifyAppointment(selected.id, { date: modifyDate, time: modifyTime })
    setEditing(false)
    setSearched(false)
  }

  const isBlockedDate = (dateKey: string) => {
    if (isPastDate(dateKey)) return true
    if (isSunday(dateKey)) return true
    return organization.manualDateBlocks.some((item) => dateKey >= item.startDate && dateKey <= item.endDate)
  }

  if (editing && selected) {
    return (
      <section className="animate-apple-in space-y-8">
        <button 
          onClick={() => setEditing(false)} 
          className="group inline-flex items-center gap-2 text-[14px] font-bold tracking-tight text-muted/80 hover:text-foreground transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.03] group-hover:bg-foreground/[0.08] transition-colors">
            <ArrowLeft size={16} />
          </div>
          Volver a mi reserva
        </button>

        <div className="space-y-2">
          <h1 className="text-[36px] font-extrabold leading-[1.1] tracking-tighter text-foreground">
            Reprogramar cita
          </h1>
          <p className="text-[16px] text-muted/80">Selecciona una nueva fecha y hora para tu turno.</p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-border/50 bg-foreground/[0.02] px-6 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted/80">Cita actual</p>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-muted">
                  <Scissors size={20} />
                </div>
                <p className="text-[20px] font-bold tracking-tight text-foreground">{selected.service}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted/80">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/[0.03] border border-border/50">
                <CalendarDays size={14} />
                <span className="text-[13px] font-bold">{selected.date}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/[0.03] border border-border/50">
                <Clock size={14} />
                <span className="text-[13px] font-bold">{selected.time}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[13px] font-bold uppercase tracking-wider text-muted/80 ml-1">Nueva Fecha</label>
            <DatePicker value={modifyDate} onChange={(value) => { setModifyDate(value); setModifyTime("") }} isBlocked={isBlockedDate} />
          </div>
          
          <div className="space-y-3">
            <label className="text-[13px] font-bold uppercase tracking-wider text-muted/80 ml-1">Nueva Hora</label>
            <TimePicker slots={availableSlots} value={modifyTime} onChange={setModifyTime} />
          </div>
        </div>

        <Button 
          onClick={confirmModify} 
          disabled={!modifyTime} 
          className="h-[58px] w-full rounded-2xl bg-foreground text-[16px] font-extrabold text-background shadow-xl shadow-foreground/10 hover:shadow-foreground/20 active:scale-[0.98] transition-all"
        >
          Confirmar Cambios
        </Button>
      </section>
    )
  }

  return (
    <section className="animate-apple-in space-y-8">
      <Link 
        href="/" 
        className="group inline-flex items-center gap-2 text-[14px] font-bold tracking-tight text-muted/80 hover:text-foreground transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.03] group-hover:bg-foreground/[0.08] transition-colors">
          <ArrowLeft size={16} />
        </div>
        Inicio
      </Link>

      <div className="space-y-2">
        <h1 className="text-[36px] font-extrabold leading-[1.1] tracking-tighter text-foreground">
          Gestionar Cita
        </h1>
        <p className="text-[16px] text-muted/80">Busca tus reservas activas utilizando tu correo electrónico.</p>
      </div>

      <div className="glass-card overflow-hidden p-6 sm:p-8">
        <BookingSearch email={email} onEmailChange={setEmail} onSearch={search} />
      </div>

      {error && (
        <div className="animate-apple-in rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-500 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[14px] font-bold tracking-tight">{error.message}</p>
          </div>
          {error.whatsappUrl && (
            <a 
              href={error.whatsappUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="mt-3 inline-flex items-center font-extrabold text-[13px] uppercase tracking-wider underline hover:opacity-80 transition-opacity"
            >
              Contactar por WhatsApp
            </a>
          )}
        </div>
      )}

      {found.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3 ml-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <p className="text-[13px] font-bold uppercase tracking-wider text-muted/80">Reservas encontradas ({found.length})</p>
          </div>
          <div className="grid gap-6">
            {found.map((appointment) => (
              <BookingDetails 
                key={appointment.id} 
                appointment={appointment} 
                onCancel={() => openCancel(appointment)} 
                onModify={() => openModify(appointment)} 
              />
            ))}
          </div>
        </div>
      )}

      {searched && found.length === 0 && (
        <div className="animate-apple-in glass-card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground/[0.03] mb-4">
            <Mail className="text-muted/40" size={32} />
          </div>
          <p className="text-[16px] font-bold text-foreground">No encontramos reservas</p>
          <p className="mt-1 text-[14px] text-muted/80">Verifica que el email sea el mismo que usaste al reservar.</p>
        </div>
      )}

      <Modal open={cancelModal} onClose={() => setCancelModal(false)} className="max-w-[480px]">
        <div className="overflow-hidden rounded-[28px] border border-border/50 bg-background p-8 shadow-2xl backdrop-blur-xl animate-apple-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-6">
            <CalendarDays size={28} />
          </div>
          <h3 className="text-center text-[24px] font-extrabold leading-tight tracking-tight text-foreground">
            ¿Confirmas la cancelación?
          </h3>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-muted/80">
            Esta acción no se puede deshacer. Se liberará tu lugar y el barbero será notificado.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={confirmCancel}
              className="h-14 w-full rounded-2xl bg-red-500 text-[15px] font-extrabold text-[#fafafa] shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-[0.98]"
            >
              Sí, cancelar mi cita
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCancelModal(false)}
              className="h-14 w-full rounded-2xl border-border/50 py-3 text-[15px] font-bold text-muted hover:text-foreground hover:bg-foreground/[0.03] transition-all"
            >
              Ahora no, volver
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
