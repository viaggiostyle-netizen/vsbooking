import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { isAdmin } from "@/lib/isAdmin"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? null

  if (!email) {
    return NextResponse.json({ isAdmin: false })
  }

  const authorized = await isAdmin(email)
  return NextResponse.json({ isAdmin: authorized })
}
