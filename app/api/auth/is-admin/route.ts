import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { isAdmin } from "@/lib/isAdmin"

export const dynamic = "force-dynamic"
const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? null

  if (!email) {
    return NextResponse.json({ isAdmin: false }, { headers: noStoreHeaders })
  }

  const authorized = await isAdmin(email)
  return NextResponse.json({ isAdmin: authorized }, { headers: noStoreHeaders })
}
