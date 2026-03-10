"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Calendar, Clock3 } from "lucide-react"
import { useRouter } from "next/navigation"
import Button from "@/components/ui/Button"
import ClientForm from "@/components/booking/ClientForm"
import CalendarBase from "@/components/booking/Calendar"
import TimePicker from "@/components/booking/TimePicker"
import BookingSummary from "@/components/booking/BookingSummary"
import { getAnnotatedSlots, type AnnotatedSlot } from "@/lib/availability"
import {
  dateKeyToDate,
  getTodayDateKeyArgentina,
  isPastDate,
  isSunday,
} from "@/lib/date"
import { buildBookingPayload, useAppointmentsStore } from "@/stores/useAppointmentsStore"
import { useOrganizationStore } from "@/stores/useOrganizationStore"
import { usePromotionsStore } from "@/stores/usePromotionsStore"
import { useServicesStore } from "@/stores/useServicesStore"
import {
  normalizeEmail,
  sanitizePhoneLocalInput,
  validateArgentinaMobilePhone,
  validateBookingContact,
  validateEmail,
} from "@/lib/validation/booking"

export default function BookingForm() {
  const router = useRouter()
  const services = useServicesStore((state) => state.services)
  const selected = useServicesStore((state) => state.selected)
  const clearSelection = useServicesStore((state) => state.clearSelection)

  const appointments = useAppointmentsStore((state) => state.appointments)
  const createAppointment = useAppointmentsStore((state) => state.createAppointment)
  const organization = useOrganizationStore()
  const promotions = usePromotionsStore((state) => state.promotions)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [date, setDate] = useState(getTodayDateKeyArgentina())
  const [selectedTime, setSelectedTime] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [website, setWebsite] = useState("")

  const selectedServices = useMemo(() => {
    return selected
      .map((item) => {
        const service = services.find((entry) => entry.id === item.serviceId)
        if (!service) return null
        return { service, quantity: item.quantity }
      })
      .filter((item): item is { service: (typeof services)[number]; quantity: number } => item !== null)
  }, [selected, services])

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, item) => sum + item.service.durationMin * item.quantity, 0),
    [selectedServices]
  )

  const availableSlots = useMemo<AnnotatedSlot[]>(() => {
    return getAnnotatedSlots({
      date,
      duration: totalDuration,
      organization,
      appointments,
    })
  }, [date, totalDuration, organization, appointments])

  const firstAvailableTime = useMemo(
    () => availableSlots.find((slot) => slot.status === "available")?.time || "",
    [availableSlots]
  )

  const selectedTimeValue = useMemo(() => {
    const isCurrentAvailable = availableSlots.some(
      (slot) => slot.time === selectedTime && slot.status === "available"
    )
    if (isCurrentAvailable) return selectedTime
    return firstAvailableTime
  }, [availableSlots, selectedTime, firstAvailableTime])

  const isBlockedDate = (dateKey: string) => {
    if (isPastDate(dateKey)) return true
    if (isSunday(dateKey)) return true
    return organization.manualDateBlocks.some((item) => dateKey >= item.startDate && dateKey <= item.endDate)
  }

  const phoneValidation = validateArgentinaMobilePhone(phone)
  const emailValidation = validateEmail(email)
  const phoneError = phoneTouched && !phoneValidation.valid ? phoneValidation.message : ""
  const emailError = emailTouched && !emailValidation.valid ? emailValidation.message : ""
  const formContactValidation = validateBookingContact({ name, phone, email })
  const canSubmit =
    Boolean(selectedTimeValue) &&
    formContactValidation.ok &&
    selectedServices.length > 0 &&
    !isSubmitting

  const submit = async () => {
    setPhoneTouched(true)
    setEmailTouched(true)

    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError("Completa todos los campos obligatorios.")
      return
    }

    if (website.trim()) {
      setError("No se pudo procesar la reserva.")
      return
    }

    if (!formContactValidation.ok) {
      setError(
        (!formContactValidation.phone.valid && formContactValidation.phone.message) ||
          (!formContactValidation.email.valid && formContactValidation.email.message) ||
          "Revisa tus datos antes de continuar."
      )
      return
    }

    if (selectedServices.length === 0) {
      setError("Selecciona al menos un servicio.")
      return
    }

    if (!selectedTimeValue) {
      setError("No hay horarios disponibles para la fecha seleccionada.")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      const validationResponse = await fetch("/api/bookings/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          website,
        }),
      })

      if (!validationResponse.ok) {
        type ValidationErrorPayload = {
          message?: string
          errors?: { phone?: string | null; email?: string | null; name?: string | null }
        }
        const payload = (await validationResponse.json()) as ValidationErrorPayload
        setError(
          payload.errors?.phone ||
            payload.errors?.email ||
            payload.errors?.name ||
            payload.message ||
            "No se pudo validar la reserva."
        )
        return
      }

      type ValidationOkPayload = {
        ok: true
        data: { name: string; phone: string; email: string }
      }
      const validationPayload = (await validationResponse.json()) as ValidationOkPayload

      const payload = buildBookingPayload(
        {
          name: validationPayload.data.name,
          phone: validationPayload.data.phone,
          email: validationPayload.data.email,
        },
        date,
        selectedTimeValue,
        selectedServices
      )
      const bookingGroupId = createAppointment({ payload, promotions })

      clearSelection()
      router.push(`/confirmation?group=${bookingGroupId}`)
    } catch {
      setError("No se pudo validar la reserva. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reserva tu cita</h1>
        <p className="mt-1 text-sm text-muted-foreground">Completa tus datos y selecciona fecha y hora.</p>
      </div>

      <BookingSummary services={selectedServices} />

      <ClientForm
        name={name}
        phone={phone}
        email={normalizeEmail(email)}
        onNameChange={setName}
        onPhoneChange={(value) => {
          setPhone(sanitizePhoneLocalInput(value))
          setError("")
        }}
        onEmailChange={(value) => {
          setEmail(value)
          setError("")
        }}
        phoneError={phoneError}
        emailError={emailError}
        onPhoneBlur={() => setPhoneTouched(true)}
        onEmailBlur={() => {
          setEmailTouched(true)
          setEmail(normalizeEmail(email))
        }}
      />

      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="mt-6 flex items-center gap-2 text-muted-foreground">
        <Calendar size={16} />
        <p className="text-xs font-semibold uppercase tracking-wider">Selecciona una fecha</p>
      </div>

      <CalendarBase
        value={date}
        onSelect={(value) => {
          setDate(value)
          setError("")
          setSelectedTime("")
        }}
        isBlocked={isBlockedDate}
        selectedDayTone="ink"
      />

      <div className="mt-6 flex items-center gap-2 text-muted-foreground">
        <Clock3 size={16} />
        <p className="text-xs font-semibold uppercase tracking-wider">
          Horarios para{" "}
          {new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(
            dateKeyToDate(date)
          )}
        </p>
      </div>

      <TimePicker
        slots={availableSlots}
        value={selectedTimeValue}
        onChange={(value) => {
          setSelectedTime(value)
          setError("")
        }}
      />

      <div className="pt-4">
        <Button
          onClick={submit}
          disabled={!canSubmit}
          className="h-12 w-full rounded-full bg-foreground text-background font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Validando..." : "Agendar cita"}
        </Button>

        <button
          onClick={() => router.push("/")}
          className="mx-auto mt-4 flex items-center justify-center gap-2 text-base font-semibold text-foreground transition-colors hover:text-muted-foreground"
        >
          <ArrowLeft size={16} />
          Volver
        </button>
      </div>

      {error ? (
        <p className="text-center text-[14px] text-red-300">{error}</p>
      ) : null}
    </section>
  )
}
