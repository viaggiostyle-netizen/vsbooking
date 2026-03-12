import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { checkIfEmailIsAdmin, normalizeEmail } from "@/lib/auth/admins"
import { authOptions } from "@/lib/auth/options"
import {
  toCanonicalAppointmentStatus,
  toLegacyAppointmentStatus,
} from "@/lib/appointment-status"

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url
  return { baseUrl: `${baseUrl}/rest/v1`, serviceRoleKey: key }
}

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  const email = normalizeEmail(session?.user?.email)
  if (!email) return false
  return checkIfEmailIsAdmin(email)
}

async function getBookingClientEmail(id: string): Promise<string | null> {
  const config = getSupabaseRestConfig()
  if (!config) return null
  const res = await fetch(
    `${config.baseUrl}/bookings?id=eq.${encodeURIComponent(id)}&select=client_email`,
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
  const rows = (await res.json()) as { client_email: string }[]
  return rows?.[0]?.client_email ?? null
}

export async function POST(req: Request) {
  const config = getSupabaseRestConfig()
  if (!config) {
    return NextResponse.json(
      { message: "Configuracion de Supabase no disponible." },
      { status: 500 }
    )
  }

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

  const legacyPayload = appointments.map((a: Record<string, unknown>) => ({
    id: a.id,
    booking_group_id: a.bookingGroupId ?? a.id,
    client_name: a.clientName,
    client_phone: a.clientPhone,
    client_email: a.clientEmail ?? "",
    service_id: a.serviceId ?? "",
    service_name: a.service,
    duration_min: a.durationMin ?? 40,
    price: a.price ?? 0,
    original_price: a.originalPrice ?? a.price ?? 0,
    final_price: a.finalPrice ?? a.price ?? 0,
    promotion_id: a.promotionId ?? null,
    date: a.date,
    time: a.time,
    status: toLegacyAppointmentStatus(
      toCanonicalAppointmentStatus((a.status as string) ?? "pending")
    ),
    created_at: (a.createdAt as string) ?? new Date().toISOString(),
  }))

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

  let body: { id: string; clientEmail?: string; status?: string; date?: string; time?: string }
  try {
    body = await req.json()
    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ message: "ID invalido." }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ message: "JSON invalido." }, { status: 400 })
  }

  const admin = await isAdmin()
  if (!admin && body.clientEmail == null) {
    return NextResponse.json(
      { message: "Se requiere clientEmail para modificar una reserva." },
      { status: 403 }
    )
  }

  if (!admin) {
    const existingEmail = await getBookingClientEmail(body.id)
    if (existingEmail == null) {
      return NextResponse.json({ message: "Reserva no encontrada." }, { status: 404 })
    }
    const normalized = (body.clientEmail ?? "").trim().toLowerCase()
    if (normalized !== existingEmail.trim().toLowerCase()) {
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

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const admin = await isAdmin()
  if (!admin) {
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

  return NextResponse.json({ ok: true })
}
