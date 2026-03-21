"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight, Check, UserX, EyeOff, XCircle } from "lucide-react"
import AppointmentEditModal from "@/components/admin/AppointmentEditModal"
import AppointmentCreateModal from "@/components/admin/AppointmentCreateModal"
import { useAppointments } from "@/context/AppointmentContext"
import { useDateBlocks } from "@/context/DateBlockContext"
import { useSettings } from "@/context/SettingsContext"
import { useTimeBlocks } from "@/context/TimeBlockContext"
import {
  cancelAppointment,
  deleteAppointment as deleteFromSupabase,
  updateAppointmentStatus,
} from "@/lib/appointments"
import {
  BASE_TIME_SLOTS,
  createId,
  readOrganizationData,
  type Service,
} from "@/lib/admin-organization"
import { toCanonicalAppointmentStatus } from "@/lib/appointment-status"
import { fetchAppointments } from "@/lib/fetchAppointments"
import { supabase } from "@/lib/supabase"
import { fetchOrganizationFromSupabase } from "@/lib/supabase/organization"
import { patchAppointmentInSupabase, upsertAppointmentsToSupabase } from "@/lib/supabase/appointments"
import { getAvailableSlots, isDateBlocked, timeToMinutes } from "@/lib/scheduleUtils"
import type { Appointment } from "@/types/Appointment"
import type { WorkBlock } from "@/types/WorkBlock"

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires"
const MIN_DATE = new Date(2026, 1, 20)
const MAX_DATE = new Date(2030, 11, 31)

const STATUS_LEGEND = [
  {
    label: "Completado",
    icon: <Check size={14} className="text-[#05AA72]" />,
    chipClass: "bg-[#05AA72]/10 text-[#05AA72] ring-[#05AA72]/20",
  },
  {
    label: "No vino, pero aviso",
    icon: <UserX size={14} className="text-[#FF6900]" />,
    chipClass: "bg-[#FF6900]/10 text-[#FF6900] ring-[#FF6900]/20",
  },
  {
    label: "No show (Ausente)",
    icon: <EyeOff size={14} className="text-[#FF637E]" />,
    chipClass: "bg-[#FF637E]/10 text-[#FF637E] ring-[#FF637E]/20",
  },
  {
    label: "Cancelado por el cliente",
    icon: <XCircle size={14} className="text-[#FB2C36]" />,
    chipClass: "bg-[#FB2C36]/10 text-[#FB2C36] ring-[#FB2C36]/20",
  },
]

export default function AgendaPage() {
  const {
    appointments,
    setAppointments,
    createAppointment,
    setAppointmentStatus,
    updateAppointment,
    deleteAppointment,
  } = useAppointments()
  const { settings } = useSettings()
  const { dateBlocks } = useDateBlocks()
  const { timeBlocks } = useTimeBlocks()

  const todayInArgentina = useMemo(() => getTodayInArgentina(), [])
  const minSelectableDate = useMemo(() => maxDate(MIN_DATE, todayInArgentina), [todayInArgentina])

  const [selectedDate, setSelectedDate] = useState<Date>(minSelectableDate)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [organizationData, setOrganizationData] = useState(() => readOrganizationData())

  const [turnDate, setTurnDate] = useState<Date | null>(null)
  const [turnTime, setTurnTime] = useState("")
  const [error, setError] = useState("")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false)
  const [monthCursor, setMonthCursor] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )
  const servicePickerRef = useRef<HTMLDivElement | null>(null)

  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [appointmentModalVersion, setAppointmentModalVersion] = useState(0)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [editDateKey, setEditDateKey] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editServiceId, setEditServiceId] = useState("")
  const [appointmentActionError, setAppointmentActionError] = useState("")
  const [isSavingAction, setIsSavingAction] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  const weekStart = useMemo(() => getWeekStartMonday(selectedDate), [selectedDate])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  )
  const visibleWeekDays = useMemo(() => weekDays.filter((day) => day.getDay() !== 0), [weekDays])

  const displayedRange = useMemo(() => {
    const weekEnd = addDays(weekStart, 5)
    return formatWeekRange(weekStart, weekEnd)
  }, [weekStart])

  const activeServices = useMemo(
    () => organizationData.services.filter((service) => service.active),
    [organizationData.services]
  )

  const organizationWorkBlocks = useMemo<WorkBlock[]>(
    () => mapSchedulesToWorkBlocks(organizationData.schedules),
    [organizationData.schedules]
  )

  const availableTurnTimes = useMemo(
    () =>
      !turnDate
        ? []
        : getAvailableSlots({
          date: toDateKey(turnDate),
          workBlocks: organizationWorkBlocks,
          settings,
          dateBlocks,
          timeBlocks,
          appointments,
        }),
    [turnDate, organizationWorkBlocks, settings, dateBlocks, timeBlocks, appointments]
  )

  const editableServices = useMemo(() => {
    if (!selectedAppointment) return activeServices

    const hasCurrentInCatalog = activeServices.some(
      (service) =>
        service.id === selectedAppointment.serviceId ||
        service.name === selectedAppointment.service
    )
    if (hasCurrentInCatalog) return activeServices

    const currentService: Service = {
      id: selectedAppointment.serviceId || `custom-${selectedAppointment.id}`,
      name: selectedAppointment.service,
      description: "",
      priceArs: selectedAppointment.finalPrice,
      durationMin: selectedAppointment.durationMin || settings.turnDuration,
      active: true,
    }

    return [currentService, ...activeServices]
  }, [activeServices, selectedAppointment, settings.turnDuration])

  const availableEditTimes = useMemo(() => {
    if (!selectedAppointment) return []
    if (!editDateKey) return []

    const withoutCurrentAppointment = appointments.filter(
      (appointment) => appointment.id !== selectedAppointment.id
    )

    const slots = getAvailableSlots({
      date: editDateKey,
      workBlocks: organizationWorkBlocks,
      settings,
      dateBlocks,
      timeBlocks,
      appointments: withoutCurrentAppointment,
    })

    if (editDateKey === selectedAppointment.date && !slots.includes(selectedAppointment.time)) {
      slots.push(selectedAppointment.time)
      slots.sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
    }

    return [...new Set(slots)]
  }, [
    appointments,
    dateBlocks,
    editDateKey,
    organizationWorkBlocks,
    selectedAppointment,
    settings,
    timeBlocks,
  ])

  const selectedTurnTime = availableTurnTimes.includes(turnTime) ? turnTime : ""
  const openCreateTurnModal = useCallback(() => {
    const latestOrganization = readOrganizationData()
    setOrganizationData(latestOrganization)

    setTurnDate(null)
    setTurnTime("")
    setError("")
    setMonthCursor(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    setIsDatePickerOpen(false)
    setIsServicePickerOpen(false)
    setIsModalOpen(true)
  }, [selectedDate])

  const openAppointmentModal = (appointment: Appointment) => {
    const latestOrganization = readOrganizationData()
    setOrganizationData(latestOrganization)

    const latestActive = latestOrganization.services.filter((service) => service.active)
    const matchedService = latestActive.find(
      (service) =>
        service.id === appointment.serviceId || service.name === appointment.service
    )

    setSelectedAppointment(appointment)
    setEditDateKey(appointment.date)
    setEditTime(appointment.time)
    setEditServiceId(matchedService?.id ?? latestActive[0]?.id ?? "")
    setAppointmentActionError("")
    setAppointmentModalVersion((value) => value + 1)
    setAppointmentModalOpen(true)
  }

  const closeAppointmentModal = () => {
    if (isSavingAction) return
    setAppointmentModalOpen(false)
    setSelectedAppointment(null)
    setAppointmentActionError("")
  }

  const loadAppointments = useCallback(async () => {
    try {
      const rows = await fetchAppointments()
      setAppointments(rows)
    } catch (fetchError: unknown) {
      const message =
        fetchError instanceof Error ? fetchError.message : String(fetchError)
      console.error("AgendaPage: Fallo al cargar los turnos:", message)
    }
  }, [setAppointments])

  const refreshAgendaData = async () => {
    await loadAppointments()
  }

  const runStatusAction = async (
    status: "completed" | "no_show_with_notice" | "no_show" | "cancelled"
  ) => {
    if (!selectedAppointment) return
    if (isSavingAction) return

    const previousStatus = selectedAppointment.status

    setIsSavingAction(true)
    setAppointmentActionError("")
    setAppointmentStatus(selectedAppointment.id, status)

    try {
      if (status === "cancelled") {
        await cancelAppointment(selectedAppointment.id)
      } else {
        await updateAppointmentStatus(selectedAppointment.id, status)
      }
      await refreshAgendaData()
      setAppointmentModalOpen(false)
      setSelectedAppointment(null)
    } catch {
      setAppointmentStatus(selectedAppointment.id, previousStatus)
      setAppointmentActionError(
        "No se pudo actualizar el turno. Reintenta en unos segundos."
      )
    } finally {
      setIsSavingAction(false)
    }
  }

  const runDeleteAction = async () => {
    if (!selectedAppointment) return
    if (isSavingAction) return

    setIsSavingAction(true)
    setAppointmentActionError("")

    try {
      await deleteFromSupabase(selectedAppointment.id)
      deleteAppointment(selectedAppointment.id)
      setAppointmentModalOpen(false)
      setSelectedAppointment(null)
    } catch {
      setAppointmentActionError("Error al eliminar la cita. Intenta nuevamente.")
    } finally {
      setIsSavingAction(false)
    }
  }

  const runModifyAction = async () => {
    if (!selectedAppointment) return false
    if (isSavingAction) return false

    const selectedEditService =
      editableServices.find((service) => service.id === editServiceId) ?? null

    if (!selectedEditService) {
      setAppointmentActionError("Selecciona un servicio valido.")
      return false
    }

    if (!editDateKey) {
      setAppointmentActionError("Selecciona una fecha para modificar la cita.")
      return false
    }

    if (!editTime) {
      setAppointmentActionError("Selecciona un horario disponible.")
      return false
    }

    if (!availableEditTimes.includes(editTime)) {
      setAppointmentActionError("El horario seleccionado ya no esta disponible.")
      return false
    }

    const patch = {
      date: editDateKey,
      time: editTime,
      serviceId: selectedEditService.id,
      service: selectedEditService.name,
      durationMin: selectedEditService.durationMin,
      price: selectedEditService.priceArs,
      originalPrice: selectedEditService.priceArs,
      finalPrice: selectedEditService.priceArs,
    }

    const rollbackPatch = {
      date: selectedAppointment.date,
      time: selectedAppointment.time,
      serviceId: selectedAppointment.serviceId,
      service: selectedAppointment.service,
      durationMin: selectedAppointment.durationMin,
      price: selectedAppointment.price,
      originalPrice: selectedAppointment.originalPrice,
      finalPrice: selectedAppointment.finalPrice,
    }

    setIsSavingAction(true)
    setAppointmentActionError("")
    updateAppointment(selectedAppointment.id, patch)
    setSelectedAppointment((current) => (current ? { ...current, ...patch } : current))

    try {
      const servicePatched = await patchAppointmentInSupabase(selectedAppointment.id, patch)
      if (!servicePatched) throw new Error("No se pudo guardar la modificacion")

      await refreshAgendaData()
      return true
    } catch {
      updateAppointment(selectedAppointment.id, rollbackPatch)
      setSelectedAppointment((current) => (current ? { ...current, ...rollbackPatch } : current))
      setAppointmentActionError("No se pudo modificar la cita. Reintenta nuevamente.")
      return false
    } finally {
      setIsSavingAction(false)
    }
  }

  useEffect(() => {
    setHasMounted(true)
    loadAppointments()

    // Sincronizar configuracion desde la base de datos
    fetchOrganizationFromSupabase().then((data) => {
      if (data) setOrganizationData(data)
    })
  }, [loadAppointments])

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          loadAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [loadAppointments])

  useEffect(() => {
    if (!isServicePickerOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!servicePickerRef.current) return
      if (servicePickerRef.current.contains(event.target as Node)) return
      setIsServicePickerOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isServicePickerOpen])

  useEffect(() => {
    const handleOpenManualTurn = () => {
      openCreateTurnModal()
    }

    window.addEventListener("admin:open-manual-turn", handleOpenManualTurn)
    return () => {
      window.removeEventListener("admin:open-manual-turn", handleOpenManualTurn)
    }
  }, [openCreateTurnModal])

  useEffect(() => {
    if (!hasMounted) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("nuevo") !== "1") return

    openCreateTurnModal()
    params.delete("nuevo")
    const query = params.toString()
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname
    window.history.replaceState({}, "", nextUrl)
  }, [hasMounted, openCreateTurnModal])

  useEffect(() => {
    if (!selectedAppointment) return
    if (!availableEditTimes.includes(editTime)) {
      if (editDateKey === selectedAppointment.date && availableEditTimes.includes(selectedAppointment.time)) {
        setEditTime(selectedAppointment.time)
      } else {
        setEditTime("")
      }
    }
  }, [availableEditTimes, editDateKey, editTime, selectedAppointment])

  const handleManualTurnSubmit = async (data: { clientName: string; phone: string; serviceId: string; date: string; time: string }) => {
    const service = activeServices.find(s => s.id === data.serviceId)
    if (!service) return setError("Selecciona un servicio valido")

    const newId = createId()
    const newAppointment: Appointment = {
      id: newId,
      bookingGroupId: newId,
      clientName: data.clientName.trim(),
      clientPhone: data.phone.trim(),
      clientEmail: "",
      serviceId: service.id,
      service: service.name,
      durationMin: service.durationMin,
      price: service.priceArs,
      originalPrice: service.priceArs,
      finalPrice: service.priceArs,
      promotionId: null,
      date: data.date,
      time: data.time,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    setIsSavingAction(true)
    try {
      createAppointment(newAppointment)
      await upsertAppointmentsToSupabase([newAppointment])
      await refreshAgendaData()
      setIsModalOpen(false)
    } catch (err) {
      console.error("Error al guardar en Supabase:", err)
      setError("Error al guardar en la base de datos")
    } finally {
      setIsSavingAction(false)
    }
  }

  if (!hasMounted) {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 text-center">
        <p className="text-muted italic animate-pulse">Cargando agenda...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Agenda</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight">Agenda</h1>
        <p className="mt-1 text-[13px] text-muted">Administra turnos, estados y cambios de fecha.</p>
      </header>

      <div className="mb-5 overflow-hidden rounded-[26px] border border-surface bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card)_96%,transparent),color-mix(in_srgb,var(--background)_88%,transparent))] p-3.5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[var(--accent)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Vista semanal
              </p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-foreground">
                Agenda
              </h2>
              <p className="mt-1 text-[13px] text-muted">{displayedRange}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 xl:items-end">
            <div className="inline-flex items-center gap-1 rounded-full border border-surface bg-[color-mix(in_srgb,var(--background)_72%,transparent)] p-1 shadow-[0_8px_18px_rgba(15,23,42,0.07)] backdrop-blur-xl">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition-all duration-200 hover:bg-card hover:text-foreground"
                aria-label="Semana anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setSelectedDate(minSelectableDate)}
                className="rounded-full bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] transition-all duration-200 hover:brightness-110"
              >
                Hoy
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition-all duration-200 hover:bg-card hover:text-foreground"
                aria-label="Semana siguiente"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              {STATUS_LEGEND.map((status) => (
                <div
                  key={status.label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${status.chipClass}`}
                >
                  {status.icon}
                  <span>{status.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-surface bg-[color-mix(in_srgb,var(--card)_92%,transparent)] shadow-[0_20px_52px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-[82px] border-b border-r border-surface bg-[color-mix(in_srgb,var(--card)_96%,transparent)] px-2 py-2.5 text-center align-middle backdrop-blur-xl">
                  <div className="flex min-h-[74px] items-center justify-center">
                    <span className="inline-flex items-center justify-center rounded-full border border-surface bg-[color-mix(in_srgb,var(--background)_72%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted shadow-[0_6px_12px_rgba(15,23,42,0.07)]">
                      Hora
                    </span>
                  </div>
                </th>
                {visibleWeekDays.map((day) => {
                  const isCurrentDay = isSameDay(day, selectedDate)

                  return (
                    <th
                      key={day.toISOString()}
                      className="border-b border-r border-surface bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-1.5 py-2.5 text-center backdrop-blur-xl"
                    >
                      <div
                        className={`mx-auto flex min-h-[74px] w-full max-w-[108px] flex-col items-center justify-center rounded-[20px] border px-2 py-2.5 text-center transition-all duration-300 ${isCurrentDay
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
                            : "border-surface bg-[color-mix(in_srgb,var(--background)_74%,transparent)] text-foreground"
                          }`}
                      >
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isCurrentDay ? "text-white/75" : "text-muted"
                            }`}
                        >
                          {formatWeekDay(day)}
                        </p>
                        <p className="mt-1 text-[24px] font-semibold leading-none">{day.getDate()}</p>
                        <p
                          className={`mt-1 text-[10px] font-medium capitalize ${isCurrentDay ? "text-white/82" : "text-muted"
                            }`}
                        >
                          {formatShortMonth(day)}
                        </p>
                        {isCurrentDay ? (
                          <span className="mt-1.5 rounded-full bg-white/16 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
                            Hoy
                          </span>
                        ) : null}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {BASE_TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="sticky left-0 z-10 h-[64px] border-r border-t border-surface bg-[color-mix(in_srgb,var(--card)_96%,transparent)] px-2.5 align-top backdrop-blur-xl">
                    <div className="flex h-full items-start justify-end pt-2">
                      <span className="rounded-full border border-surface bg-[color-mix(in_srgb,var(--background)_72%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-muted shadow-[0_6px_12px_rgba(15,23,42,0.07)]">
                        {slot}
                      </span>
                    </div>
                  </td>

                  {visibleWeekDays.map((day) => {
                    const isCurrentDay = isSameDay(day, selectedDate)
                    const dateKey = toDateKey(day)
                    const dayTurns = (hasMounted ? appointments : []).filter(
                      (item) => item.date === dateKey && item.time === slot
                    )

                    return (
                      <td
                        key={`${dateKey}-${slot}`}
                        className={`h-[64px] min-w-[136px] border-r border-t border-surface px-1.5 py-1.5 align-top ${isCurrentDay
                            ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_8%,transparent),transparent)]"
                            : "bg-[color-mix(in_srgb,var(--card)_84%,transparent)]"
                          }`}
                      >
                        <div className="flex h-full flex-col gap-1">
                          {dayTurns.map((item) => {
                            const style = getAppointmentStyle(item.status)
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => openAppointmentModal(item)}
                                className={`w-full rounded-[15px] border px-2 py-1.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur-[10px] transition-all duration-300 ease-out hover:-translate-y-[1px] active:scale-[0.99] ${style.containerClass}`}
                              >
                                <p className={`truncate text-[10px] font-semibold ${style.textClass}`}>
                                  {item.clientName}
                                </p>
                                <p className={`mt-0.5 truncate text-[9px] font-medium ${style.secondaryTextClass}`}>
                                  {item.service}
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AppointmentCreateModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        services={activeServices}
        availableSlots={availableTurnTimes}
        isDateBlocked={(dateKey) => {
          const parsedDate = dateFromDateKey(dateKey)
          if (!parsedDate) return true
          return !isSelectableDate(parsedDate, minSelectableDate) || isDateBlocked(dateKey, dateBlocks)
        }}
        onSelectDate={(date) => {
          const parsed = dateFromDateKey(date)
          if (parsed) setTurnDate(parsed)
          setTurnTime("")
        }}
        selectedDate={turnDate ? toDateKey(turnDate) : ""}
        selectedTime={selectedTurnTime}
        onSelectTime={setTurnTime}
        onSubmit={handleManualTurnSubmit}
        isSaving={isSavingAction}
        error={error}
      />

      <AppointmentEditModal
        key={appointmentModalVersion}
        open={appointmentModalOpen}
        appointment={selectedAppointment}
        services={editableServices}
        selectedServiceId={editServiceId}
        selectedDate={editDateKey}
        selectedTime={editTime}
        availableSlots={availableEditTimes}
        isDateBlocked={(dateKey) => {
          const parsedDate = dateFromDateKey(dateKey)
          if (!parsedDate) return true
          if (!isSelectableDate(parsedDate, minSelectableDate)) return true
          if (isDateBlocked(dateKey, dateBlocks)) return true
          return false
        }}
        isSaving={isSavingAction}
        error={appointmentActionError}
        onClose={closeAppointmentModal}
        onSelectService={setEditServiceId}
        onSelectDate={(dateKey) => {
          setEditDateKey(dateKey)
          setEditTime("")
          setAppointmentActionError("")
        }}
        onSelectTime={(time) => {
          setEditTime(time)
          setAppointmentActionError("")
        }}
        onComplete={async () => {
          await runStatusAction("completed")
        }}
        onNoShowWithNotice={async () => {
          await runStatusAction("no_show_with_notice")
        }}
        onNoShow={async () => {
          await runStatusAction("no_show")
        }}
        onModify={runModifyAction}
        onDelete={runDeleteAction}
      />

      {isDatePickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsDatePickerOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[320px] p-4 animate-in fade-in zoom-in duration-200"
          >
            <MonthPicker
              monthCursor={monthCursor}
              selectedDate={turnDate ?? minSelectableDate}
              minSelectableDate={minSelectableDate}
              onMonthChange={setMonthCursor}
              onSelectDate={(date) => {
                setTurnDate(date)
                setIsDatePickerOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function MonthPicker({
  monthCursor,
  selectedDate,
  minSelectableDate,
  onMonthChange,
  onSelectDate,
}: {
  monthCursor: Date
  selectedDate: Date
  minSelectableDate: Date
  onMonthChange: (month: Date) => void
  onSelectDate: (day: Date) => void
}) {
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(
    monthCursor
  )
  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
  const offset = (firstDay.getDay() + 6) % 7
  const start = addDays(firstDay, -offset)
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index))

  return (
    <div className="z-10 w-[300px] rounded-[26px] border border-surface bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card)_96%,transparent),color-mix(in_srgb,var(--background)_88%,transparent))] p-3.5 shadow-[0_24px_64px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Seleccionar fecha
          </p>
          <p className="mt-1 text-[15px] font-semibold capitalize text-foreground">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onMonthChange(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
            }
            className="grid h-8 w-8 place-items-center rounded-full border border-surface bg-[color-mix(in_srgb,var(--background)_74%,transparent)] text-muted transition-all duration-200 hover:bg-card hover:text-foreground"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() =>
              onMonthChange(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
            }
            className="grid h-8 w-8 place-items-center rounded-full border border-surface bg-[color-mix(in_srgb,var(--background)_74%,transparent)] text-muted transition-all duration-200 hover:bg-card hover:text-foreground"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/70">
        {"lu ma mi ju vi sa do".split(" ").map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5">
        {days.map((day) => {
          const inCurrentMonth = day.getMonth() === monthCursor.getMonth()
          const selectable = isSelectableDate(day, minSelectableDate)
          const selected = isSameDay(day, selectedDate)

          return (
            <button
              key={day.toISOString()}
              onClick={() => selectable && onSelectDate(day)}
              disabled={!selectable}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-200 ${selected
                  ? "bg-[var(--accent)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                  : inCurrentMonth
                    ? selectable
                      ? "bg-[color-mix(in_srgb,var(--card)_88%,transparent)] text-foreground hover:-translate-y-[1px] hover:bg-[color-mix(in_srgb,var(--background)_84%,transparent)]"
                      : "text-muted/40"
                    : "text-muted/30"
                }`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatWeekRange(start: Date, end: Date) {
  const fmtDayMonth = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" })
  const fmtDayMonthYear = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return `${fmtDayMonth.format(start)} - ${fmtDayMonthYear.format(end)}`
}

function formatWeekDay(date: Date) {
  const day = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date)
  return day.replace(".", "").toUpperCase()
}

function formatShortMonth(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(date)
    .replace(".", "")
}

function getTodayInArgentina() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const [year, month, day] = formatter.format(new Date()).split("-").map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return normalizeDate(copy)
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getWeekStartMonday(date: Date) {
  const normalized = normalizeDate(date)
  const day = normalized.getDay()
  const offset = day === 0 ? -6 : 1 - day
  return addDays(normalized, offset)
}

function compareDate(a: Date, b: Date) {
  return normalizeDate(a).getTime() - normalizeDate(b).getTime()
}

function maxDate(a: Date, b: Date) {
  return compareDate(a, b) >= 0 ? normalizeDate(a) : normalizeDate(b)
}

function isSameDay(a: Date, b: Date) {
  return compareDate(a, b) === 0
}

function isSelectableDate(date: Date, minSelectableDate: Date) {
  const normalized = normalizeDate(date)
  if (normalized.getDay() === 0) return false
  if (compareDate(normalized, minSelectableDate) < 0) return false
  if (compareDate(normalized, MAX_DATE) > 0) return false
  return true
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`
}

function dateFromDateKey(dateKey: string): Date | null {
  const [year, month, day] = dateKey.split("-").map(Number)
  if (!year || !month || !day) return null
  const value = new Date(year, month - 1, day)
  if (Number.isNaN(value.getTime())) return null
  return value
}

function getAppointmentStyle(status: Appointment["status"]) {
  const canonical = toCanonicalAppointmentStatus(status)

  if (canonical === "completed") {
    return {
      containerClass:
        "border-[#05AA72] bg-[#05AA72] shadow-[0_12px_24px_rgba(5,170,114,0.24)] hover:bg-[#049965] hover:shadow-[0_16px_30px_rgba(5,170,114,0.28)]",
      textClass: "text-white",
      secondaryTextClass: "text-white/85",
    }
  }

  if (canonical === "no_show_with_notice") {
    return {
      containerClass:
        "border-[#FF6900] bg-[#FF6900] shadow-[0_12px_24px_rgba(255,105,0,0.24)] hover:bg-[#e86000] hover:shadow-[0_16px_30px_rgba(255,105,0,0.28)]",
      textClass: "text-white",
      secondaryTextClass: "text-white/85",
    }
  }

  if (canonical === "no_show") {
    return {
      containerClass:
        "border-[#FF637E] bg-[#FF637E] shadow-[0_12px_24px_rgba(255,99,126,0.24)] hover:bg-[#f55571] hover:shadow-[0_16px_30px_rgba(255,99,126,0.28)]",
      textClass: "text-white",
      secondaryTextClass: "text-white/85",
    }
  }

  if (canonical === "cancelled") {
    return {
      containerClass:
        "border-[#FB2C36] bg-[#FB2C36] shadow-[0_12px_24px_rgba(251,44,54,0.24)] hover:bg-[#eb1d29] hover:shadow-[0_16px_30px_rgba(251,44,54,0.28)]",
      textClass: "text-white",
      secondaryTextClass: "text-white/85",
    }
  }

  return {
    containerClass:
      "border-surface bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_74%,transparent),color-mix(in_srgb,var(--card)_96%,transparent))] hover:bg-[color-mix(in_srgb,var(--background)_84%,transparent)] hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)]",
    textClass: "text-foreground",
    secondaryTextClass: "text-muted",
  }
}

function mapSchedulesToWorkBlocks(
  schedules: ReturnType<typeof readOrganizationData>["schedules"]
): WorkBlock[] {
  const dayToWeekNumber: Record<keyof typeof schedules, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  const blocks: WorkBlock[] = []

  Object.entries(schedules).forEach(([dayKey, daySchedule]) => {
    if (!daySchedule.active) return

    daySchedule.blocks.forEach((block) => {
      blocks.push({
        id: `${dayKey}-${block.id}`,
        daysOfWeek: [dayToWeekNumber[dayKey as keyof typeof schedules]],
        startTime: block.start,
        endTime: block.end,
        enabled: true,
        createdAt: new Date().toISOString(),
      })
    })
  })

  return blocks
}
