"use client"

import React, { useEffect, useRef, useState } from "react"
import { getSession, signIn, signOut, useSession } from "next-auth/react"

export default function AuthExpiryHandler() {
  const { data: session } = useSession()
  const [showModal, setShowModal] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const pollingRef = useRef<number | null>(null)

  // Helper to open re-login modal
  function promptReLogin() {
    try {
      // client-side telemetry for visibility
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const payload = JSON.stringify({ level: "warn", message: "session_expiry_prompt", ts: Date.now() })
        navigator.sendBeacon("/api/logs/auth", payload)
      } else {
        void fetch("/api/logs/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ level: "warn", message: "session_expiry_prompt", ts: Date.now() }) }).catch(()=>{})
      }
    } catch (e) {}
    setShowModal(true)
  }

  // Monkey-patch window.fetch to detect 401 responses and auth redirects
  useEffect(() => {
    if (typeof window === "undefined") return

    const originalFetch = window.fetch.bind(window)

    async function patchedFetch(input: RequestInfo, init?: RequestInit) {
      try {
        const res = await originalFetch(input, init)
        // Detect unauthorized
        if (res.status === 401) {
          console.warn("[auth] intercepted 401 response", { url: input })
          try { void fetch("/api/logs/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ level: "warn", message: "401_intercept", url: String(input), ts: Date.now() }) }) } catch (e) {}
          promptReLogin()
        }
        // Some servers may redirect to an auth URL; detect final URL
        if (res.redirected) {
          try {
            const url = new URL(res.url)
            if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/api/auth")) {
              console.warn("[auth] intercepted redirect to auth", { url: res.url })
              try { void fetch("/api/logs/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ level: "info", message: "auth_redirect_intercept", url: res.url, ts: Date.now() }) }) } catch (e) {}
              promptReLogin()
            }
          } catch (e) {}
        }
        return res
      } catch (e) {
        // Network errors: just rethrow
        throw e
      }
    }

    // Install
    // @ts-ignore - safe to override in browser
    window.fetch = patchedFetch

    return () => {
      // Restore original
      try {
        // @ts-ignore
        window.fetch = originalFetch
      } catch (e) {}
    }
  }, [])

  // Proactive expiry watcher: check session.expiresAt and show modal before expiry
  useEffect(() => {
    if (!session) return

    function checkExpiry() {
      try {
        const anySession: any = session
        if (!anySession.expiresAt) return
        const now = Math.floor(Date.now() / 1000)
        const expiresAt = Number(anySession.expiresAt)
        const diff = expiresAt - now
        setSecondsLeft(diff)
        // If expiry within 2 minutes, prompt re-login
        if (diff > 0 && diff < 120) {
          promptReLogin()
        }
      } catch (e) {}
    }

    checkExpiry()
    const id = window.setInterval(checkExpiry, 30 * 1000)
    pollingRef.current = id
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current)
    }
  }, [session])

  // Visibility change: revalidate session on wake-up
  useEffect(() => {
    async function handleVisibility() {
      if (document.visibilityState === "visible") {
        try {
          const s = await getSession()
          if (!s) {
            promptReLogin()
          }
        } catch (e) {
          // network or other error — do nothing
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  return (
    <>
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setShowModal(false)} />
          <div style={{ position: "relative", maxWidth: 520, margin: "10vh auto", background: "white", padding: 24, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Tu sesión expiró o está por expirar</h3>
            <p>
              Por seguridad debes volver a iniciar sesión para continuar. No perderás tu trabajo local; al reingresar volverás a la página actual.
            </p>
            {secondsLeft !== null && secondsLeft > 0 && (
              <p>Tiempo restante estimado: {Math.max(0, secondsLeft)} segundos</p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => { setShowModal(false) }} style={{ padding: "8px 12px" }}>
                Cerrar
              </button>
              <button
                onClick={() => {
                  // Use NextAuth signIn to preserve redirect back to current page
                  signIn(undefined, { callbackUrl: window.location.href })
                }}
                style={{ padding: "8px 12px", background: "#0b5cff", color: "white", border: "none", borderRadius: 4 }}
              >
                Reingresar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
