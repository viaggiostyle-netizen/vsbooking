import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function isUnset(value: string | undefined) {
  if (!value) return true
  const normalized = value.trim()
  if (!normalized) return true
  if (normalized.startsWith("YOUR_")) return true
  if (normalized.includes("missing-")) return true
  return false
}

export async function GET() {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const

  const missing = required.filter((key) => isUnset(process.env[key]))
  const configured = missing.length === 0

  return NextResponse.json({ configured, missing })
}
