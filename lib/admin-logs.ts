type AdminLogAction = "admin_added" | "admin_removed"

type AdminLogPayload = {
  action: AdminLogAction
  actorEmail: string
  targetEmail: string
}

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function readSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return {
    supabaseUrl: normalizeBaseUrl(supabaseUrl),
    serviceRoleKey,
  }
}

export async function logAdminAction(payload: AdminLogPayload) {
  const config = readSupabaseConfig()
  if (!config) return

  const { supabaseUrl, serviceRoleKey } = config

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/admin_logs`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          action: payload.action,
          actor_email: payload.actorEmail,
          target_email: payload.targetEmail,
        },
      ]),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("Failed to log admin action", response.status, errorText)
    }
  } catch (error) {
    console.error("Failed to log admin action", error)
  }
}

