import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { normalizeEmail } from "@/lib/auth/admins"
import { isAdmin } from "@/lib/isAdmin"

export const dynamic = "force-dynamic"

function readAdminAccessCode() {
  const configuredCode =
    process.env.ADMIN_ACCESS_CODE?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_ACCESS_CODE?.trim()

  if (isValidAdminAccessCode(configuredCode)) return configuredCode
  if (process.env.NODE_ENV !== "production") return "482731"

  return ""
}

function isValidAdminAccessCode(value: string) {
  return /^\d{6}$/.test(value.trim())
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ? normalizeEmail(session.user.email) : null

  if (!email) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 })
  }

  const authorized = await isAdmin(email)
  if (!authorized) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 })
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const code = typeof body === "object" && body && "code" in body ? String((body as { code?: unknown }).code ?? "") : ""
  const expectedCode = readAdminAccessCode()

  if (!isValidAdminAccessCode(expectedCode)) {
    return NextResponse.json(
      { ok: false, message: "No hay un código de acceso válido configurado en el entorno." },
      { status: 500 }
    )
  }

  if (!isValidAdminAccessCode(code)) {
    return NextResponse.json({ ok: false, message: "Código inválido." }, { status: 400 })
  }

  if (code !== expectedCode) {
    return NextResponse.json({ ok: false, message: "Código incorrecto." }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
