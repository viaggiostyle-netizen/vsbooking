import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get("authorization")
  if (cronSecret && authorization === `Bearer ${cronSecret}`) return true

  // Fallback for projects where the cron secret has not been configured yet.
  // This endpoint only performs a read-only health query against Supabase.
  const userAgent = request.headers.get("user-agent") ?? ""
  return userAgent.startsWith("vercel-cron/")
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from("system_settings")
      .select("setting_key", { count: "exact", head: true })

    if (error) {
      console.error("[cron] Supabase keepalive failed:", error.message)
      return NextResponse.json(
        { ok: false, message: "Supabase keepalive failed", detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      service: "supabase-keepalive",
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[cron] Supabase keepalive crashed:", message)
    return NextResponse.json(
      { ok: false, message: "Supabase keepalive crashed", detail: message },
      { status: 500 }
    )
  }
}
