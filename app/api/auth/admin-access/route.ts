import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { normalizeEmail } from "@/lib/auth/admins"
import { isAdmin } from "@/lib/isAdmin"

export const dynamic = "force-dynamic"

function readAdminAccessCode() {
  return (
    process.env.ADMIN_ACCESS_CODE?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_ACCESS_CODE?.trim() ||
    "482731"
  )
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

  if (!isValidAdminAccessCode(code) || !isValidAdminAccessCode(expectedCode)) {
    return NextResponse.json({ ok: false, message: "Código inválido." }, { status: 400 })
  }

  if (code !== expectedCode) {
    return NextResponse.json({ ok: false, message: "Código incorrecto." }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
