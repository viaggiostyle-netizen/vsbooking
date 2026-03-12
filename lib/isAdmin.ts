import "server-only"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { normalizeEmail } from "@/lib/auth/admins"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function isAdmin(email?: string | null) {
  let targetEmail = email ?? null

  if (!targetEmail) {
    const session = await getServerSession(authOptions)
    targetEmail = session?.user?.email ?? null
  }

  const normalizedEmail = normalizeEmail(targetEmail)
  if (!normalizedEmail) return false

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("email", normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[isAdmin] Error consultando admins:", error)
    return false
  }

  return Boolean(data?.id)
}
