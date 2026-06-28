import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: true }, { status: 204 })

    const { level = "info", message = "", ...meta } = body
    const payload = { level, message, meta }

    // Minimal server-side logging for auth-related client events.
    if (level === "error") {
      console.error("[client-logs][auth]", message, meta)
    } else if (level === "warn") {
      console.warn("[client-logs][auth]", message, meta)
    } else {
      console.info("[client-logs][auth]", message, meta)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[client-logs][auth] error parsing body", e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
