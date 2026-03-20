import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { listAdminActions } from "@/lib/admin-logs"
import { authOptions } from "@/lib/auth/options"
import { checkIfEmailIsAdmin, normalizeEmail } from "@/lib/auth/admins"

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

export async function GET(request: Request) {
  const auth = await ensureAuthorizedAdmin()
  if ("response" in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number(limitParam) : undefined
  const activities = await listAdminActions({ limit })
  return NextResponse.json({ activities })
}
