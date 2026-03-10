export type AdminRecord = {
  id: string
  email: string
  created_at: string
}

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function readSupabaseAuthConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return {
    supabaseUrl: normalizeBaseUrl(supabaseUrl),
    serviceRoleKey,
  }
}

function requireSupabaseAuthConfig() {
  const config = readSupabaseAuthConfig()
  if (!config) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para validar admins."
    )
  }
  return config
}

function buildRestUrl(pathAndQuery: string) {
  const { supabaseUrl } = requireSupabaseAuthConfig()
  return `${supabaseUrl}/rest/v1/${pathAndQuery}`
}

function buildAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const { serviceRoleKey } = requireSupabaseAuthConfig()
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  }
}

async function requestSupabase<T>(
  pathAndQuery: string,
  init: RequestInit = {},
  options: { noThrow?: boolean } = {}
) {
  const response = await fetch(buildRestUrl(pathAndQuery), {
    ...init,
    cache: "no-store",
    headers: buildAuthHeaders(init.headers),
  })

  if (!response.ok) {
    if (options.noThrow) return null
    const errorBody = await response.text()
    throw new Error(`Supabase admins error ${response.status}: ${errorBody}`)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF]/g

export function normalizeEmail(email: string | null | undefined) {
  const clean = (email ?? "").replace(INVISIBLE_CHARS_REGEX, "").trim().toLowerCase()
  if (!clean) return ""

  const atIndex = clean.lastIndexOf("@")
  if (atIndex <= 0 || atIndex === clean.length - 1) return clean

  const local = clean.slice(0, atIndex)
  const domain = clean.slice(atIndex + 1)

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const canonicalLocal = local.split("+")[0]?.replace(/\./g, "") ?? local
    return `${canonicalLocal}@gmail.com`
  }

  return `${local}@${domain}`
}

export function isValidGmail(email: string | null | undefined) {
  const value = normalizeEmail(email)
  return /^[a-z0-9._%+-]+@gmail\.com$/i.test(value)
}

export async function checkIfEmailIsAdmin(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return false
  if (!readSupabaseAuthConfig()) return false

  const encodedEmail = encodeURIComponent(normalizedEmail)
  const rows = await requestSupabase<Array<Pick<AdminRecord, "id">>>(
    `admins?select=id&email=eq.${encodedEmail}&limit=1`,
    { method: "GET" },
    { noThrow: true }
  )

  if (Array.isArray(rows) && rows.length > 0) {
    return true
  }

  // If there are no admins at all, register this one as the First Admin
  try {
    const total = await countAdmins()
    if (total === 0) {
      // Direct insert to avoid infinite loop with insertAdmin which calls checkIfEmailIsAdmin
      const created = await requestSupabase<AdminRecord[]>("admins", {
        method: "POST",
        headers: buildAuthHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify([{ email: normalizedEmail }]),
      })
      if (created?.[0]) return true
    }
  } catch (error) {
    console.error("No se pudo auto-registrar el primer admin:", error)
  }

  return false
}

export async function listAdmins() {
  const rows = await requestSupabase<AdminRecord[]>(
    "admins?select=id,email,created_at&order=created_at.desc",
    { method: "GET" }
  )

  return rows ?? []
}

export async function getAdminById(id: string) {
  const cleanId = id.trim()
  if (!cleanId) return null

  const encodedId = encodeURIComponent(cleanId)
  const rows = await requestSupabase<AdminRecord[]>(
    `admins?select=id,email,created_at&id=eq.${encodedId}&limit=1`,
    { method: "GET" },
    { noThrow: true }
  )

  if (!rows || rows.length === 0) return null
  return rows[0]
}

export async function countAdmins() {
  const rows = await requestSupabase<Array<Pick<AdminRecord, "id">>>(
    "admins?select=id",
    { method: "GET" }
  )

  return rows?.length ?? 0
}

export async function insertAdmin(email: string) {
  const normalizedEmail = normalizeEmail(email)
  if (!isValidGmail(normalizedEmail)) {
    throw new Error("Solo se permiten correos Gmail validos.")
  }

  const existing = await checkIfEmailIsAdmin(normalizedEmail)
  if (existing) {
    throw new Error("Ese correo ya tiene acceso de administrador.")
  }

  const created = await requestSupabase<AdminRecord[]>("admins", {
    method: "POST",
    headers: buildAuthHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify([{ email: normalizedEmail }]),
  })

  if (!created?.[0]) {
    throw new Error("No se pudo crear el administrador.")
  }

  return created[0]
}

export async function removeAdmin(id: string) {
  const cleanId = id.trim()
  if (!cleanId) throw new Error("ID de administrador invalido.")

  const encodedId = encodeURIComponent(cleanId)
  await requestSupabase(`admins?id=eq.${encodedId}`, {
    method: "DELETE",
    headers: buildAuthHeaders({ Prefer: "return=minimal" }),
  })
}

