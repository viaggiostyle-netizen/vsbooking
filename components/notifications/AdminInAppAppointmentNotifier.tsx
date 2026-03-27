"use client"

import { useEffect } from "react"
import type { MessagePayload } from "firebase/messaging"
import { useRouter } from "next/navigation"
import { showAdminAppointmentEventToast } from "@/components/ui/app-toast"
import { useAppointments } from "@/context/AppointmentContext"
import { formatShortDateWithDay, getTodayDateKeyArgentina } from "@/lib/date"
import { listenAdminForegroundMessages } from "@/lib/firebase/client"
import { fetchAppointmentsFromSupabase } from "@/lib/supabase/appointments"
import { useAppointmentsStore } from "@/stores/useAppointmentsStore"
import { useWhitelistedAdmin } from "@/hooks/useWhitelistedAdmin"

type LiveEventType = "created" | "modified" | "cancelled"
type LiveToastVariant = "success" | "warning" | "error"

type ParsedAppointmentEvent = {
  eventType: LiveEventType
  variant: LiveToastVariant
  title: string
  message: string
  date?: string
  time?: string
  toastId: string
}

const CREATED_BODY_REGEX =
  /^(?<client>.+?) reservo (?<service>.+?) para el (?<date>\d{4}-\d{2}-\d{2}) a las (?<time>\d{2}:\d{2})$/i
const MODIFIED_BODY_REGEX =
  /^(?<client>.+?) cambio su turno de (?<previousDate>\d{4}-\d{2}-\d{2}) (?<previousTime>\d{2}:\d{2}) al (?<date>\d{4}-\d{2}-\d{2}) (?<time>\d{2}:\d{2})$/i
const CANCELLED_BODY_REGEX =
  /^(?<client>.+?) cancelo su turno de (?<service>.+?) el (?<date>\d{4}-\d{2}-\d{2}) a las (?<time>\d{2}:\d{2})$/i

export default function AdminInAppAppointmentNotifier() {
  const router = useRouter()
  const { setAppointments } = useAppointments()
  const replaceAppointments = useAppointmentsStore((state) => state.replaceAppointments)
  const { status, isWhitelistedAdmin } = useWhitelistedAdmin()

  useEffect(() => {
    if (status !== "authenticated" || !isWhitelistedAdmin) return

    let active = true
    let unsubscribe: (() => void) | null = null

    async function syncAppointments() {
      const remote = await fetchAppointmentsFromSupabase()
      if (!active || !remote) return
      setAppointments(remote)
      replaceAppointments(remote)
    }

    function handleToastClick(event: ParsedAppointmentEvent) {
      const destination = resolveAppointmentDestination(event)
      router.push(destination)
    }

    void (async () => {
      const stop = await listenAdminForegroundMessages((payload) => {
        if (!active) return
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return

        const event = parseAppointmentEventPayload(payload)
        if (!event) return

        void syncAppointments()
        showAdminAppointmentEventToast(event.variant, event.message, {
          title: event.title,
          toastId: event.toastId,
          onClick: () => handleToastClick(event),
        })
      })

      if (!active) {
        stop?.()
        return
      }

      unsubscribe = stop
    })()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [isWhitelistedAdmin, replaceAppointments, router, setAppointments, status])

  return null
}

function parseAppointmentEventPayload(payload: MessagePayload): ParsedAppointmentEvent | null {
  const eventType = normalizeEventType(payload.data?.eventType)
  if (!eventType) return null

  const body = getPayloadBody(payload)
  const toastId = payload.messageId ?? `${eventType}-${body}`

  switch (eventType) {
    case "created":
      return buildCreatedEvent(body, toastId)
    case "modified":
      return buildModifiedEvent(body, toastId)
    case "cancelled":
      return buildCancelledEvent(body, toastId)
    default:
      return null
  }
}

function buildCreatedEvent(body: string, toastId: string): ParsedAppointmentEvent {
  const match = body.match(CREATED_BODY_REGEX)
  const client = trimNamedCapture(match, "client")
  const service = trimNamedCapture(match, "service")
  const date = trimNamedCapture(match, "date")
  const time = trimNamedCapture(match, "time")
  const dateLabel = date ? formatShortDateWithDay(date) : "la fecha indicada"

  return {
    eventType: "created",
    variant: "success",
    title: "Success!",
    message:
      client && service && date && time
        ? `${client} agendo ${service} para ${dateLabel} a las ${time}.`
        : body || "Un cliente agendo una cita.",
    date: date || undefined,
    time: time || undefined,
    toastId,
  }
}

function buildModifiedEvent(body: string, toastId: string): ParsedAppointmentEvent {
  const match = body.match(MODIFIED_BODY_REGEX)
  const client = trimNamedCapture(match, "client")
  const date = trimNamedCapture(match, "date")
  const time = trimNamedCapture(match, "time")
  const dateLabel = date ? formatShortDateWithDay(date) : "la fecha indicada"

  return {
    eventType: "modified",
    variant: "warning",
    title: "Warning!",
    message:
      client && date && time
        ? `${client} reprogramo su cita para ${dateLabel} a las ${time}.`
        : body || "Un cliente modifico su cita.",
    date: date || undefined,
    time: time || undefined,
    toastId,
  }
}

function buildCancelledEvent(body: string, toastId: string): ParsedAppointmentEvent {
  const match = body.match(CANCELLED_BODY_REGEX)
  const client = trimNamedCapture(match, "client")
  const service = trimNamedCapture(match, "service")
  const date = trimNamedCapture(match, "date")
  const time = trimNamedCapture(match, "time")
  const dateLabel = date ? formatShortDateWithDay(date) : "la fecha indicada"

  return {
    eventType: "cancelled",
    variant: "error",
    title: "Cancelada",
    message:
      client && date && time
        ? `${client} cancelo su cita${service ? ` de ${service}` : ""} para ${dateLabel} a las ${time}.`
        : body || "Un cliente cancelo su cita.",
    date: date || undefined,
    time: time || undefined,
    toastId,
  }
}

function getPayloadBody(payload: MessagePayload) {
  return payload.notification?.body?.trim() || payload.data?.body?.trim() || ""
}

function normalizeEventType(value: string | undefined): LiveEventType | null {
  if (value === "created" || value === "modified" || value === "cancelled") return value
  return null
}

function trimNamedCapture(match: RegExpMatchArray | null, key: string) {
  const value = match?.groups?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function resolveAppointmentDestination(event: ParsedAppointmentEvent) {
  if (!event.date) return "/admin/agenda"
  if (event.date === getTodayDateKeyArgentina()) return "/admin"

  const params = new URLSearchParams({ date: event.date })
  if (event.time) params.set("time", event.time)
  return `/admin/agenda?${params.toString()}`
}
