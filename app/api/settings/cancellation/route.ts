import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { logAdminAction } from "@/lib/admin-logs"
import { authOptions } from "@/lib/auth/options"
import { checkIfEmailIsAdmin, normalizeEmail } from "@/lib/auth/admins"
import {
  getAppointmentCancellationHours,
  setAppointmentCancellationHours,
} from "@/lib/system-settings"

async function ensureAuthorizedAdmin() {
  const session = await getServerSession(authOptions)
  const email = normalizeEmail(session?.user?.email)

  if (!email) {
    return { response: NextResponse.json({ message: "No autenticado." }, { status: 401 }) }
  }

  const isAuthorized = await checkIfEmailIsAdmin(email)
  if (!isAuthorized) {
    return { response: NextResponse.json({ message: "Not Found" }, { status: 404 }) }
  }

  return { email }
}

export async function GET() {
  const auth = await ensureAuthorizedAdmin()
  if ("response" in auth) return auth.response

  const hours = await getAppointmentCancellationHours()
  return NextResponse.json({ hours })
}

export async function POST(req: Request) {
  const auth = await ensureAuthorizedAdmin()
  if ("response" in auth) return auth.response

  try {
    const body = (await req.json()) as { hours?: number }
    const parsed = Number(body?.hours)

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        { message: "Las horas deben ser un numero mayor a 0." },
        { status: 400 }
      )
    }

    await setAppointmentCancellationHours(parsed)
    void logAdminAction({
      action: "cancellation_policy_updated",
      actorEmail: auth.email,
      targetLabel: `${Math.floor(parsed)} horas de anticipacion`,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la configuracion."
    return NextResponse.json({ message }, { status: 500 })
  }
}
