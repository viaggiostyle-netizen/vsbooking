"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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
      <section className="space-y-5">
        <button onClick={() => setEditing(false)} className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} />
          Volver a mi reserva
        </button>

        <div>
          <h1 className="text-[40px] font-semibold leading-none">Modificar cita</h1>
          <p className="mt-2 text-[15px] text-muted">Selecciona una nueva fecha y hora para tu cita.</p>
        </div>

        <div className="rounded-[16px] border border-border bg-card p-4">
          <p className="text-sm text-muted">Cita actual:</p>
          <p className="mt-2 text-[24px] font-semibold leading-none">{selected.service}</p>
          <p className="mt-2 text-[18px] text-muted">
            {selected.date} a las {selected.time}
          </p>
        </div>

        <DatePicker value={modifyDate} onChange={(value) => { setModifyDate(value); setModifyTime("") }} isBlocked={isBlockedDate} />
        <TimePicker slots={availableSlots} value={modifyTime} onChange={setModifyTime} />

        <Button onClick={confirmModify} disabled={!modifyTime} className="w-full rounded-[12px] py-3 text-[15px] font-semibold">
          Confirmar modificacion
        </Button>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> Volver
      </Link>

      <div>
        <h1 className="text-[24px] font-[700] leading-[1.02] tracking-[-0.3px] text-foreground">Gestionar mi cita</h1>
        <p className="mt-2 text-[14px] font-[400] text-muted">Ingresa tu email para buscar tu reserva.</p>
      </div>

      <BookingSearch email={email} onEmailChange={setEmail} onSearch={search} />

      {error && (
        <div className="rounded-[14px] border border-red-700 bg-red-950/60 p-3 text-sm text-red-300">
          <p>{error.message}</p>
          {error.whatsappUrl && (
            <a href={error.whatsappUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-sm underline">
              Contacto
            </a>
          )}
        </div>
      )}

      {found.length > 0 && (
        <div className="space-y-3">
          {found.map((appointment) => (
            <div key={appointment.id}>
              <BookingDetails appointment={appointment} onCancel={() => openCancel(appointment)} onModify={() => openModify(appointment)} />
            </div>
          ))}
        </div>
      )}

      {searched && found.length === 0 && (
        <p className="text-base text-muted">No encontramos reservas activas para ese email.</p>
      )}

      <Modal open={cancelModal} onClose={() => setCancelModal(false)} className="max-w-[520px]">
        <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <h3 className="text-[24px] font-semibold leading-tight text-foreground">
            ¿Seguro que quieres cancelar tu cita?
          </h3>
          <p className="mt-3 text-[14px] text-muted">
            Si cancelas tu cita no se podra revertir el cambio. Si lo haces, avisa al barbero.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setCancelModal(false)}
              className="w-full rounded-[12px] px-5 py-2 text-[14px] sm:w-auto"
            >
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancel}
              className="w-full rounded-[12px] px-5 py-2 text-[14px] sm:w-auto"
            >
              Cancelar cita
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
