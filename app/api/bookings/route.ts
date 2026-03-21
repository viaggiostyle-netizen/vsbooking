import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { logAdminAction } from "@/lib/admin-logs"
import { checkIfEmailIsAdmin, normalizeEmail } from "@/lib/auth/admins"
import { authOptions } from "@/lib/auth/options"
import {
  toCanonicalAppointmentStatus,
  toLegacyAppointmentStatus,
} from "@/lib/appointment-status"
import { notifyAdminAppointmentEvent } from "@/lib/notifications/appointment-events"
import type { Appointment } from "@/types/Appointment"

type BookingLookup = {
  client_email: string
  client_name: string
  service_name: string
  date: string
  time: string
  status: Appointment["status"]
}

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url
  return { baseUrl: `${baseUrl}/rest/v1`, serviceRoleKey: key }
}

type BookingPatchBody = {
  id: string
  clientEmail?: string
  status?: Appointment["status"]
  date?: string
  time?: string
  serviceId?: string
  service?: string
  durationMin?: number
  price?: number
  originalPrice?: number
  finalPrice?: number
}

async function getAuthenticatedAdminEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  const email = normalizeEmail(session?.user?.email)
  if (!email) return null
  return (await checkIfEmailIsAdmin(email)) ? email : null
}

async function getBookingById(id: string): Promise<BookingLookup | null> {
  const config = getSupabaseRestConfig()
  if (!config) return null
  const res = await fetch(
    `${config.baseUrl}/bookings?id=eq.${encodeURIComponent(id)}&select=client_email,client_name,service_name,date,time,status`,
    {
      method: "GET",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: "no-store",
    }
  )
  if (!res.ok) return null
  const rows = (await res.json()) as BookingLookup[]
  return rows?.[0] ?? null
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeAppointmentStatus(value: unknown): Appointment["status"] {
  switch (value) {
    case "completed":
    case "cancelled":
    case "no_show":
    case "no_show_with_notice":
    case "no_vino_aviso":
    case "no_vino_no_aviso":
    case "pending":
      return value
    default:
      return "pending"
  }
}

function summarizeServices(appointments: unknown[]) {
  const uniqueServices = [...new Set(
    appointments
      .map((value) =>
        value && typeof value === "object"
          ? asString((value as { service?: unknown; serviceName?: unknown }).serviceName ?? (value as { service?: unknown; serviceName?: unknown }).service)
          : ""
      )
      .filter(Boolean)
  )]

  if (uniqueServices.length === 0) return "un turno"
  if (uniqueServices.length === 1) return uniqueServices[0]
  if (uniqueServices.length === 2) return `${uniqueServices[0]} + ${uniqueServices[1]}`
  return `${uniqueServices[0]} + ${uniqueServices.length - 1} mas`
}

function buildCreatedNotificationPayload(appointments: unknown[]) {
  const first = appointments.find((value) => value && typeof value === "object")
  if (!first || typeof first !== "object") return null

  const record = first as {
    clientName?: unknown
    date?: unknown
    time?: unknown
  }

  const clientName = asString(record.clientName) || "Un cliente"
  const date = asString(record.date)
  const time = asString(record.time)

  if (!date || !time) return null

  return {
    clientName,
    service: summarizeServices(appointments),
    date,
    time,
  }
}

function buildBookingActivityLabel(args: {
  clientName: string
  service: string
  date: string
  time: string
  status?: Appointment["status"]
}) {
  const pieces = [args.clientName, args.service, `${args.date} ${args.time}`]
  const statusLabel = formatStatusLabel(args.status)
  if (statusLabel) pieces.push(statusLabel)
  return pieces.filter(Boolean).join(" - ")
}

function formatStatusLabel(status: Appointment["status"] | undefined) {
  switch (status) {
    case "completed":
      return "Completado"
    case "cancelled":
      return "Cancelado"
    case "no_vino_aviso":
    case "no_show_with_notice":
      return "No show con aviso"
    case "no_vino_no_aviso":
    case "no_show":
      return "No show"
    case "pending":
      return "Pendiente"
    default:
      return ""
  }
}

export async function POST(req: Request) {
  const config = getSupabaseRestConfig()
  if (!config) {
    return NextResponse.json(
      { message: "Configuracion de Supabase no disponible." },
      { status: 500 }
    )
  }

  const adminEmail = await getAuthenticatedAdminEmail()
  const admin = Boolean(adminEmail)
  let appointments: unknown[]
  try {
    const body = await req.json()
    if (!body?.appointments || !Array.isArray(body.appointments)) {
      return NextResponse.json({ message: "Cuerpo invalido." }, { status: 400 })
    }
    appointments = body.appointments
  } catch {
    return NextResponse.json({ message: "JSON invalido." }, { status: 400 })
  }

  const legacyPayload = appointments.map((value) => {
    const a = isRecord(value) ? value : {}
    const id = asString(a.id)
    const price = asNumber(a.price, 0)

    return {
      id,
      booking_group_id: asString(a.bookingGroupId) || id,
      client_name: asString(a.clientName),
      client_phone: asString(a.clientPhone),
      client_email: asString(a.clientEmail),
      service_id: asString(a.serviceId),
      service_name: asString(a.service),
      duration_min: asNumber(a.durationMin, 40),
      price,
      original_price: asNumber(a.originalPrice, price),
      final_price: asNumber(a.finalPrice, price),
      promotion_id: asString(a.promotionId) || null,
      date: asString(a.date),
      time: asString(a.time),
      status: toLegacyAppointmentStatus(
        toCanonicalAppointmentStatus(normalizeAppointmentStatus(a.status))
      ),
      created_at: asString(a.createdAt) || new Date().toISOString(),
    }
  })

  const res = await fetch(`${config.baseUrl}/bookings`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(legacyPayload),
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("Bookings API POST:", res.status, text)
    return NextResponse.json(
      { message: "No se pudieron crear las reservas.", details: text || null },
      { status: 500 }
    )
  }

  if (admin && adminEmail) {
    const firstCreated = buildCreatedNotificationPayload(appointments)
    if (firstCreated) {
      void logAdminAction({
        action: "appointment_created",
        actorEmail: adminEmail,
        targetLabel: buildBookingActivityLabel(firstCreated),
      })
    }
  } else {
    const notificationPayload = buildCreatedNotificationPayload(appointments)
    if (notificationPayload) {
      try {
        await notifyAdminAppointmentEvent({
          type: "created",
          ...notificationPayload,
        })
      } catch (error) {
        console.error("Bookings API POST notification error:", error)
      }
    }
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const config = getSupabaseRestConfig()
  if (!config) {
    return NextResponse.json(
      { message: "Configuracion de Supabase no disponible." },
      { status: 500 }
    )
  }

  let body: BookingPatchBody
  try {
    body = await req.json()
    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ message: "ID invalido." }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ message: "JSON invalido." }, { status: 400 })
  }

  const adminEmail = await getAuthenticatedAdminEmail()
  const admin = Boolean(adminEmail)
  const existingBooking = await getBookingById(body.id)

  if (!existingBooking) {
    return NextResponse.json({ message: "Reserva no encontrada." }, { status: 404 })
  }

  if (!admin && body.clientEmail == null) {
    return NextResponse.json(
      { message: "Se requiere clientEmail para modificar una reserva." },
      { status: 403 }
    )
  }

  if (!admin) {
    const normalized = (body.clientEmail ?? "").trim().toLowerCase()
    if (normalized !== existingBooking.client_email.trim().toLowerCase()) {
      return NextResponse.json(
        { message: "No tienes permiso para modificar esta reserva." },
        { status: 403 }
      )
    }
  }

  const legacyPayload: Record<string, unknown> = {}
  if (body.status != null) {
    legacyPayload.status = toLegacyAppointmentStatus(
      toCanonicalAppointmentStatus(body.status)
    )
  }
  if (body.date != null) legacyPayload.date = body.date
  if (body.time != null) legacyPayload.time = body.time
  if (body.service != null) legacyPayload.service_name = body.service
  if (body.serviceId != null) legacyPayload.service_id = body.serviceId
  if (typeof body.durationMin === "number") legacyPayload.duration_min = body.durationMin
  if (typeof body.price === "number") legacyPayload.price = body.price
  if (typeof body.originalPrice === "number") legacyPayload.original_price = body.originalPrice
  if (typeof body.finalPrice === "number") legacyPayload.final_price = body.finalPrice

  if (Object.keys(legacyPayload).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const res = await fetch(
    `${config.baseUrl}/bookings?id=eq.${encodeURIComponent(body.id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(legacyPayload),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("Bookings API PATCH:", res.status, text)
    return NextResponse.json(
      { message: "No se pudo actualizar la reserva." },
      { status: 500 }
    )
  }

  if (admin && adminEmail) {
    const nextStatus = body.status ? toCanonicalAppointmentStatus(body.status) : existingBooking.status
    const nextDate = body.date ?? existingBooking.date
    const nextTime = body.time ?? existingBooking.time
    const nextService = body.service ?? existingBooking.service_name
    const statusChanged =
      body.status != null &&
      toCanonicalAppointmentStatus(body.status) !== toCanonicalAppointmentStatus(existingBooking.status)
    const detailsChanged =
      nextDate !== existingBooking.date ||
      nextTime !== existingBooking.time ||
      nextService !== existingBooking.service_name ||
      body.serviceId != null ||
      typeof body.durationMin === "number" ||
      typeof body.price === "number" ||
      typeof body.originalPrice === "number" ||
      typeof body.finalPrice === "number"

    if (statusChanged) {
      void logAdminAction({
        action: "appointment_status_updated",
        actorEmail: adminEmail,
        targetLabel: buildBookingActivityLabel({
          clientName: existingBooking.client_name,
          service: nextService,
          date: nextDate,
          time: nextTime,
          status: nextStatus,
        }),
      })
    } else if (detailsChanged) {
      void logAdminAction({
        action: "appointment_updated",
        actorEmail: adminEmail,
        targetLabel: buildBookingActivityLabel({
          clientName: existingBooking.client_name,
          service: nextService,
          date: nextDate,
          time: nextTime,
        }),
      })
    }
  } else {
    const nextStatus = body.status ? toCanonicalAppointmentStatus(body.status) : null
    const nextDate = body.date ?? existingBooking.date
    const nextTime = body.time ?? existingBooking.time

    try {
      if (nextStatus === "cancelled") {
        await notifyAdminAppointmentEvent({
          type: "cancelled",
          clientName: existingBooking.client_name,
          service: existingBooking.service_name,
          date: existingBooking.date,
          time: existingBooking.time,
        })
      } else if (nextDate !== existingBooking.date || nextTime !== existingBooking.time) {
        await notifyAdminAppointmentEvent({
          type: "modified",
          clientName: existingBooking.client_name,
          service: existingBooking.service_name,
          previousDate: existingBooking.date,
          previousTime: existingBooking.time,
          date: nextDate,
          time: nextTime,
        })
      }
    } catch (error) {
      console.error("Bookings API PATCH notification error:", error)
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const adminEmail = await getAuthenticatedAdminEmail()
  if (!adminEmail) {
    return NextResponse.json({ message: "Not Found" }, { status: 404 })
  }

  const config = getSupabaseRestConfig()
  if (!config) {
    return NextResponse.json(
      { message: "Configuracion de Supabase no disponible." },
      { status: 500 }
    )
  }

  let body: { id?: string }
  try {
    body = await req.json()
    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ message: "ID invalido." }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ message: "JSON invalido." }, { status: 400 })
  }

  const existingBooking = await getBookingById(body.id)

  let res = await fetch(
    `${config.baseUrl}/bookings?id=eq.${encodeURIComponent(body.id)}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: "no-store",
    }
  )

  if (!res.ok) {
    res = await fetch(
      `${config.baseUrl}/appointments?id=eq.${encodeURIComponent(body.id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
        },
        cache: "no-store",
      }
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("Bookings API DELETE:", res.status, text)
    return NextResponse.json(
      { message: "No se pudo eliminar la reserva." },
      { status: 500 }
    )
  }

  if (existingBooking) {
    void logAdminAction({
      action: "appointment_deleted",
      actorEmail: adminEmail,
      targetLabel: buildBookingActivityLabel({
        clientName: existingBooking.client_name,
        service: existingBooking.service_name,
        date: existingBooking.date,
        time: existingBooking.time,
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
