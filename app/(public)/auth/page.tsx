"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

function AuthContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [googleReady, setGoogleReady] = useState<boolean | null>(null)
  const [missingEnv, setMissingEnv] = useState<string[]>([])

  const searchParams = useSearchParams()
  const authError = searchParams.get("error")

  const authErrorMessage = useMemo(() => {
    if (!authError) return ""
    if (authError === "AccessDenied") return "Esa cuenta no tiene permisos de administrador."
    if (authError === "OAuthCallback") return "No se pudo completar la respuesta de Google."
    return "No se pudo iniciar sesion con esa cuenta."
  }, [authError])

  const targetCallbackUrl = useMemo(() => {
    const callbackUrl = searchParams.get("callbackUrl")?.trim() || "/admin"
    if (!callbackUrl) return "/admin"
    if (callbackUrl.startsWith("/")) return callbackUrl

    try {
      const parsed = new URL(callbackUrl)
      if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
      }
    } catch {
      return "/admin"
    }

    return "/admin"
  }, [searchParams])

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const response = await fetch("/api/auth/google-ready", { cache: "no-store" })
        if (!response.ok) throw new Error("No se pudo validar OAuth.")
        const payload = (await response.json()) as { configured: boolean; missing?: string[] }
        if (active) setGoogleReady(Boolean(payload.configured))
        if (active) setMissingEnv(payload.missing ?? [])
      } catch {
        if (active) setGoogleReady(false)
        if (active) {
          setMissingEnv([
            "GOOGLE_CLIENT_ID",
            "GOOGLE_CLIENT_SECRET",
            "NEXTAUTH_URL",
            "NEXTAUTH_SECRET",
            "SUPABASE_SERVICE_ROLE_KEY",
          ])
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  async function handleGoogleLogin() {
    if (!googleReady) {
      setError("Google OAuth no esta configurado aun. Completa las variables de entorno.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await signIn("google", { callbackUrl: targetCallbackUrl }, { prompt: "select_account" })
    } catch {
      setError("No se pudo iniciar sesion. Intenta nuevamente.")
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full rounded-2xl border border-border/50 bg-card/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-[20px]"
    >
      <div className="mb-6 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/8 text-foreground">
          <ShieldCheck size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Acceso Administrativo</h1>
          <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
            Ingresa con tu cuenta Google autorizada para continuar al panel.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleGoogleLogin()}
        disabled={isLoading || googleReady === false}
        className={`group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/40 bg-foreground text-background text-sm font-semibold transition-all duration-200 ease-out ${isLoading || googleReady === false
          ? "cursor-not-allowed opacity-70"
          : "hover:scale-[1.01] hover:shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
          }`}
      >
        {isLoading ? "Redirigiendo..." : "Continuar con Google"}
        {!isLoading && (
          <ArrowRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        )}
      </button>

      {googleReady === false && (
        <p className="mt-3 text-sm font-medium text-amber-500">
          Configuracion pendiente: {missingEnv.join(", ")}.
        </p>
      )}
      {!error && authErrorMessage && (
        <p className="mt-3 text-sm font-medium text-rose-500">{authErrorMessage}</p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-rose-500">{error}</p>}

      <p className="mt-5 text-xs text-muted">
        Solo correos incluidos en la whitelist de administradores pueden iniciar sesion.
      </p>
    </motion.div>
  )
}

export default function AuthPage() {
  return (
    <section className="mx-auto flex min-h-[72vh] w-full max-w-[480px] items-center px-6 py-10">
      <Suspense fallback={<div className="w-full h-48 animate-pulse rounded-2xl bg-muted/20" />}>
        <AuthContent />
      </Suspense>
    </section>
  )
}

