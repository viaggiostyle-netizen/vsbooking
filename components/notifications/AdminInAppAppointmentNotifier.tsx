"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { showAdminAppointmentEventToast } from "@/components/ui/app-toast"
import { useAppointments } from "@/context/AppointmentContext"
import { useWhitelistedAdmin } from "@/hooks/useWhitelistedAdmin"
import { formatShortDateWithDay, getTodayDateKeyArgentina } from "@/lib/date"
import { consumeLocalAppointmentMutation } from "@/lib/notifications/in-app-appointment-events"
import { fetchAppointmentsFromSupabase } from "@/lib/supabase/appointments"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useAppointmentsStore } from "@/stores/useAppointmentsStore"
import type { Appointment } from "@/types/Appointment"

type LiveEventType = "created" | "modified" | "cancelled"
type LiveToastVariant = "success" | "warning" | "error"

type ParsedAppointmentEvent = {
  appointmentId: string
  bookingGroupId: string
  eventType: LiveEventType
  variant: LiveToastVariant
  title: string
  message: string
  date?: string
  time?: string
  toastId: string
}

const POLL_INTERVAL_MS = 4_000

export default function AdminInAppAppointmentNotifier() {
  const router = useRouter()
  const { setAppointments } = useAppointments()
  const replaceAppointments = useAppointmentsStore((state) => state.replaceAppointments)
  const { status, isWhitelistedAdmin } = useWhitelistedAdmin()

  useEffect(() => {
    if (status !== "authenticated" || !isWhitelistedAdmin) return

    const supabase = getSupabaseClient()

    let active = true
    let initialized = false
    let syncing = false
    let syncQueued = false
    let previousAppointments: Appointment[] = []
    let pollTimer: number | null = null
    let unsubscribeVisibility: (() => void) | null = null
    let removeChannel: (() => void) | null = null

    function syncAppointments(remote: Appointment[]) {
      setAppointments(remote)
      replaceAppointments(remote)
    }

    function handleToastClick(event: ParsedAppointmentEvent) {
      router.push(resolveAppointmentDestination(event))
    }

    function showToast(event: ParsedAppointmentEvent) {
      if (
        consumeLocalAppointmentMutation({
          eventType: event.eventType,
          appointmentId: event.appointmentId,
          bookingGroupId: event.bookingGroupId,
          date: event.date,
          time: event.time,
        })
      ) {
        return
      }

      showAdminAppointmentEventToast(event.variant, event.message, {
        title: event.title,
        toastId: event.toastId,
        onClick: () => handleToastClick(event),
      })
    }

    function applyRemoteSnapshot(remote: Appointment[]) {
      if (!active) return

      if (!initialized) {
        initialized = true
        previousAppointments = remote
        syncAppointments(remote)
        return
      }

      if (!haveAppointmentsChanged(previousAppointments, remote)) return

      const events = collectAppointmentEvents(previousAppointments, remote)
      previousAppointments = remote
      syncAppointments(remote)

      if (typeof document === "undefined" || document.visibilityState !== "visible") return

      events.forEach((event) => {
        showToast(event)
      })
    }

    async function pullLatestAppointments() {
      if (syncing) {
        syncQueued = true
        return
      }

      syncing = true

      try {
        do {
          syncQueued = false
          const remote = await fetchAppointmentsFromSupabase()
          if (!active || !remote) return
          applyRemoteSnapshot(remote)
        } while (active && syncQueued)
      } finally {
        syncing = false
      }
    }

    void pullLatestAppointments()

    if (supabase) {
      const channel = supabase
        .channel("admin-in-app-appointments")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookings",
          },
          () => {
            void pullLatestAppointments()
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
          },
          () => {
            void pullLatestAppointments()
          }
        )
        .subscribe()

      removeChannel = () => {
        void supabase.removeChannel(channel)
      }
    }

    if (typeof document !== "undefined") {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          void pullLatestAppointments()
        }
      }

      document.addEventListener("visibilitychange", handleVisibilityChange)
      unsubscribeVisibility = () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }

    pollTimer = window.setInterval(() => {
      void pullLatestAppointments()
    }, POLL_INTERVAL_MS)

    return () => {
      active = false
      if (pollTimer) window.clearInterval(pollTimer)
      unsubscribeVisibility?.()
      removeChannel?.()
    }
  }, [isWhitelistedAdmin, replaceAppointments, router, setAppointments, status])

  return null
}

function collectAppointmentEvents(
  previousAppointments: Appointment[],
  nextAppointments: Appointment[]
) {
  const previousById = new Map(previousAppointments.map((appointment) => [appointment.id, appointment]))
  const createdByGroup = new Map<string, Appointment>()
  const changedEvents: ParsedAppointmentEvent[] = []

  nextAppointments.forEach((appointment) => {
    const previous = previousById.get(appointment.id)

    if (!previous) {
      if (appointment.status === "cancelled") return

      const groupKey = appointment.bookingGroupId || appointment.id
      const existing = createdByGroup.get(groupKey)

      if (!existing || compareAppointmentMoments(appointment, existing) < 0) {
        createdByGroup.set(groupKey, appointment)
      }

      return
    }

    if (previous.status !== "cancelled" && appointment.status === "cancelled") {
      changedEvents.push(buildCancelledEvent(appointment))
      return
    }

    if (
      appointment.status !== "cancelled" &&
      (previous.date !== appointment.date || previous.time !== appointment.time)
    ) {
      changedEvents.push(buildModifiedEvent(appointment))
    }
  })

  return [
    ...[...createdByGroup.values()].map((appointment) => buildCreatedEvent(appointment)),
    ...changedEvents,
  ]
}

function buildCreatedEvent(appointment: Appointment): ParsedAppointmentEvent {
  const dateLabel = formatShortDateWithDay(appointment.date)

  return {
    appointmentId: appointment.id,
    bookingGroupId: appointment.bookingGroupId || appointment.id,
    eventType: "created",
    variant: "success",
    title: "Success!",
    message: `${appointment.clientName} agendo una cita para ${dateLabel} a las ${appointment.time}.`,
    date: appointment.date,
    time: appointment.time,
    toastId: `booking-created-${appointment.bookingGroupId || appointment.id}`,
  }
}

function buildModifiedEvent(appointment: Appointment): ParsedAppointmentEvent {
  const dateLabel = formatShortDateWithDay(appointment.date)

  return {
    appointmentId: appointment.id,
    bookingGroupId: appointment.bookingGroupId || appointment.id,
    eventType: "modified",
    variant: "warning",
    title: "Warning!",
    message: `${appointment.clientName} reprogramo su cita para ${dateLabel} a las ${appointment.time}.`,
    date: appointment.date,
    time: appointment.time,
    toastId: `booking-modified-${appointment.id}-${appointment.date}-${appointment.time}`,
  }
}

function buildCancelledEvent(appointment: Appointment): ParsedAppointmentEvent {
  const dateLabel = formatShortDateWithDay(appointment.date)

  return {
    appointmentId: appointment.id,
    bookingGroupId: appointment.bookingGroupId || appointment.id,
    eventType: "cancelled",
    variant: "error",
    title: "Cancelacion",
    message: `${appointment.clientName} cancelo su cita para ${dateLabel} a las ${appointment.time}.`,
    date: appointment.date,
    time: appointment.time,
    toastId: `booking-cancelled-${appointment.id}-${appointment.date}-${appointment.time}`,
  }
}

function haveAppointmentsChanged(previousAppointments: Appointment[], nextAppointments: Appointment[]) {
  if (previousAppointments.length !== nextAppointments.length) return true

  const previousById = new Map(previousAppointments.map((appointment) => [appointment.id, appointment]))

  return nextAppointments.some((appointment) => {
    const previous = previousById.get(appointment.id)
    if (!previous) return true

    return (
      previous.bookingGroupId !== appointment.bookingGroupId ||
      previous.clientName !== appointment.clientName ||
      previous.clientPhone !== appointment.clientPhone ||
      previous.service !== appointment.service ||
      previous.date !== appointment.date ||
      previous.time !== appointment.time ||
      previous.status !== appointment.status ||
      previous.finalPrice !== appointment.finalPrice
    )
  })
}

function compareAppointmentMoments(left: Appointment, right: Appointment) {
  return `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`)
}

function resolveAppointmentDestination(event: ParsedAppointmentEvent) {
  if (!event.date) return "/admin/agenda"
  if (event.date === getTodayDateKeyArgentina()) return "/admin"

  const params = new URLSearchParams({ date: event.date })
  if (event.time) params.set("time", event.time)
  return `/admin/agenda?${params.toString()}`
}
