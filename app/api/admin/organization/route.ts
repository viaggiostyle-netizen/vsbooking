import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { checkIfEmailIsAdmin, normalizeEmail } from "@/lib/auth/admins"
import { logAdminAction } from "@/lib/admin-logs"
import { authOptions } from "@/lib/auth/options"
import type { OrganizationData } from "@/lib/admin-organization"

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

function countActiveScheduleDays(data: OrganizationData) {
  return DAY_KEYS.filter((dayKey) => data.schedules[dayKey].active).length
}

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url
  return { baseUrl: `${baseUrl}/rest/v1`, serviceRoleKey: key }
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions)
  const email = normalizeEmail(session?.user?.email)
  if (!email) return { error: NextResponse.json({ message: "No autenticado." }, { status: 401 }) }
  const isAdmin = await checkIfEmailIsAdmin(email)
  if (!isAdmin) return { error: NextResponse.json({ message: "Not Found" }, { status: 404 }) }
  return { email }
}

export async function POST(req: Request) {
  const auth = await ensureAdmin()
  if (auth.error) return auth.error

  const config = getSupabaseRestConfig()
  if (!config) {
    return NextResponse.json(
      { message: "Configuracion de Supabase no disponible." },
      { status: 500 }
    )
  }

  let data: OrganizationData
  try {
    const body = await req.json()
    if (!body || typeof body !== "object" || !Array.isArray(body.services) || !body.schedules) {
      return NextResponse.json({ message: "Cuerpo invalido." }, { status: 400 })
    }
    data = body as OrganizationData
  } catch {
    return NextResponse.json({ message: "JSON invalido." }, { status: 400 })
  }

  const { baseUrl, serviceRoleKey } = config
  const headers: HeadersInit = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  }

  try {
    const servicesPayload = data.services.map((s, i) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      price_ars: s.priceArs,
      duration_min: s.durationMin,
      active: s.active,
      position: i,
    }))

    const existingRes = await fetch(`${baseUrl}/services?select=id`, {
      method: "GET",
      headers,
      cache: "no-store",
    })
    if (!existingRes.ok) {
      const text = await existingRes.text().catch(() => "")
      console.error("Organization API: failed to list services", existingRes.status, text)
      return NextResponse.json(
        { message: "No se pudieron listar los servicios." },
        { status: 500 }
      )
    }
    const existingServices = (await existingRes.json()) as { id: string }[]
    const existingIds = new Set((existingServices ?? []).map((r) => r.id))
    const nextIds = new Set(servicesPayload.map((r) => r.id))
    const toDelete = [...existingIds].filter((id) => !nextIds.has(id))

    if (toDelete.length > 0) {
      const deleteRes = await fetch(
        `${baseUrl}/services?id=in.(${toDelete.map((id) => encodeURIComponent(id)).join(",")})`,
        { method: "DELETE", headers, cache: "no-store" }
      )
      if (!deleteRes.ok) {
        const text = await deleteRes.text().catch(() => "")
        console.error("Organization API: failed to delete services", deleteRes.status, text)
      }
    }

    if (servicesPayload.length > 0) {
      const upsertRes = await fetch(`${baseUrl}/services`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(servicesPayload),
        cache: "no-store",
      })
      if (!upsertRes.ok) {
        const text = await upsertRes.text().catch(() => "")
        console.error("Organization API: failed to upsert services", upsertRes.status, text)
        return NextResponse.json(
          { message: "No se pudieron guardar los servicios." },
          { status: 500 }
        )
      }
    }

    const schedulesPayload = DAY_KEYS.map((dayKey) => ({
      day_key: dayKey,
      active: data.schedules[dayKey].active,
      blocks: data.schedules[dayKey].blocks.map((b) => ({
        id: b.id,
        start: b.start,
        end: b.end,
      })),
    }))

    const schedRes = await fetch(`${baseUrl}/schedules`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(schedulesPayload),
      cache: "no-store",
    })
    if (!schedRes.ok) {
      const text = await schedRes.text().catch(() => "")
      console.error("Organization API: failed to upsert schedules", schedRes.status, text)
      return NextResponse.json(
        { message: "No se pudieron guardar los horarios." },
        { status: 500 }
      )
    }

    void logAdminAction({
      action: "organization_updated",
      actorEmail: auth.email,
      targetLabel: `${data.services.length} servicios y ${countActiveScheduleDays(data)} dias activos`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al guardar la organizacion."
    console.error("Organization API:", err)
    return NextResponse.json({ message }, { status: 500 })
  }
}
