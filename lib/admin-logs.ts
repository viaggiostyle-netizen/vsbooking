export type AdminLogAction =
  | "admin_added"
  | "admin_removed"
  | "appointment_created"
  | "appointment_updated"
  | "appointment_status_updated"
  | "appointment_deleted"
  | "organization_updated"
  | "cancellation_policy_updated"

export type AdminLogPayload = {
  action: AdminLogAction
  actorEmail: string
  targetLabel: string
}

export type AdminLogRecord = {
  action: AdminLogAction
  actorEmail: string
  targetLabel: string
  createdAt: string
}

type AdminLogRow = Partial<{
  action: string
  actor_email: string
  target_email: string
  admin_email: string
  target: string
  created_at: string
}>

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
  const baseHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  }

  try {
    let response = await fetch(`${supabaseUrl}/rest/v1/admin_logs`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify([
        {
          action: payload.action,
          actor_email: payload.actorEmail,
          target_email: payload.targetLabel,
        },
      ]),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")

      // Support legacy live schemas that use `admin_email` and `target`.
      if (response.status === 400) {
        response = await fetch(`${supabaseUrl}/rest/v1/admin_logs`, {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify([
            {
              action: payload.action,
              admin_email: payload.actorEmail,
              target: payload.targetLabel,
            },
          ]),
          cache: "no-store",
        })

        if (response.ok) return

        const fallbackErrorText = await response.text().catch(() => "")
        console.error("Failed to log admin action", response.status, fallbackErrorText || errorText)
        return
      }

      console.error("Failed to log admin action", response.status, errorText)
    }
  } catch (error) {
    console.error("Failed to log admin action", error)
  }
}

export async function listAdminActions(options: { limit?: number } = {}): Promise<AdminLogRecord[]> {
  const config = readSupabaseConfig()
  if (!config) return []

  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(100, Number(options.limit))) : 25
  const { supabaseUrl, serviceRoleKey } = config

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/admin_logs?select=*&order=created_at.desc&limit=${limit}`,
      {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("Failed to list admin actions", response.status, errorText)
      return []
    }

    const rows = (await response.json()) as AdminLogRow[]

    return (rows ?? [])
      .map((row) => normalizeAdminLogRow(row))
      .filter((row): row is AdminLogRecord => row !== null)
  } catch (error) {
    console.error("Failed to list admin actions", error)
    return []
  }
}

function normalizeAdminLogRow(row: AdminLogRow): AdminLogRecord | null {
  if (!isAdminLogAction(row.action)) return null
  if (typeof row.created_at !== "string") return null

  const actorEmail =
    typeof row.actor_email === "string"
      ? row.actor_email
      : typeof row.admin_email === "string"
        ? row.admin_email
        : ""

  const targetLabel =
    typeof row.target_email === "string"
      ? row.target_email
      : typeof row.target === "string"
        ? row.target
        : ""

  return {
    action: row.action,
    actorEmail: actorEmail || "Sistema",
    targetLabel,
    createdAt: row.created_at,
  }
}

function isAdminLogAction(value: unknown): value is AdminLogAction {
  return (
    value === "admin_added" ||
    value === "admin_removed" ||
    value === "appointment_created" ||
    value === "appointment_updated" ||
    value === "appointment_status_updated" ||
    value === "appointment_deleted" ||
    value === "organization_updated" ||
    value === "cancellation_policy_updated"
  )
}
