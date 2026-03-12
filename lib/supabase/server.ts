import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let serverClient: SupabaseClient | null = null

function readSupabaseServerEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para crear el cliente Supabase server."
    )
  }

  return { supabaseUrl, serviceRoleKey }
}

export function getSupabaseServerClient(): SupabaseClient {
  if (serverClient) return serverClient

  const { supabaseUrl, serviceRoleKey } = readSupabaseServerEnv()
  serverClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serverClient
}
