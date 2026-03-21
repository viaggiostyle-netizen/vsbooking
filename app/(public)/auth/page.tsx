"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import Logo from "@/components/branding/Logo"

function AuthContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [googleReady, setGoogleReady] = useState<boolean | null>(null)
  const [missingEnv, setMissingEnv] = useState<string[]>([])
  const { theme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const searchParams = useSearchParams()
  const authError = searchParams.get("error")
  const activeTheme = theme === "system" ? resolvedTheme : theme
  const isDark = mounted ? activeTheme === "dark" : false

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
      initial={{ opacity: 0, scale: 0.985, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[30px] border border-border/60 bg-[color-mix(in_srgb,var(--card)_95%,transparent)] px-6 py-8 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:px-10 sm:py-12"
    >
      <div className="relative mx-auto flex min-h-[calc(100dvh-210px)] max-w-[420px] flex-col items-center justify-center text-center sm:min-h-[520px]">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </Link>

        <div className={`mb-7 grid h-[78px] w-[78px] place-items-center rounded-[24px] border border-border/50 shadow-[0_18px_36px_rgba(15,23,42,0.12)] ${isDark ? "bg-[#272727]" : "bg-[color-mix(in_srgb,var(--background)_72%,transparent)]"}`}>
          <Logo
            size={46}
            className="h-[46px] w-[46px]"
          />
        </div>

        <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-foreground sm:text-[40px]">
          Panel de Control
        </h1>
        <p className="mt-3 text-[15px] font-medium text-muted">
          Acceso exclusivo para administradores
        </p>

        <button
          type="button"
          onClick={() => void handleGoogleLogin()}
          disabled={isLoading || googleReady === false}
          className={`mt-9 flex h-14 w-full items-center justify-center gap-3 rounded-[18px] border border-border/50 bg-[color-mix(in_srgb,var(--background)_72%,transparent)] px-5 text-[15px] font-semibold text-foreground shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-200 ${isLoading || googleReady === false
              ? "cursor-not-allowed opacity-70"
              : "hover:-translate-y-[1px] hover:border-foreground/12 hover:bg-[color-mix(in_srgb,var(--background)_84%,transparent)]"
            }`}
        >
          <GoogleMark />
          <span>{isLoading ? "Redirigiendo..." : "Continuar con Google"}</span>
        </button>

        {googleReady === false && (
          <p className="mt-4 text-sm font-medium text-amber-500">
            Configuracion pendiente: {missingEnv.join(", ")}.
          </p>
        )}
        {!error && authErrorMessage && (
          <p className="mt-4 text-sm font-medium text-rose-500">{authErrorMessage}</p>
        )}
        {error && <p className="mt-4 text-sm font-medium text-rose-500">{error}</p>}

        <p className="mt-6 text-[13px] text-muted">Solo cuentas autorizadas pueden acceder</p>
      </div>
    </motion.div>
  )
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.805 12.041c0-.817-.066-1.413-.208-2.03H12.2v3.713h5.517c-.111.923-.71 2.313-2.04 3.248l-.019.124 3.028 2.299.21.021c1.93-1.747 3.045-4.318 3.045-7.375Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.7c2.703 0 4.974-.87 6.632-2.366l-3.162-2.444c-.847.58-1.986.986-3.47.986-2.648 0-4.896-1.746-5.698-4.159l-.12.01-3.149 2.388-.042.112C4.838 19.4 8.255 21.7 12.2 21.7Z"
        fill="#34A853"
      />
      <path
        d="M6.502 13.717a5.84 5.84 0 0 1-.334-1.926c0-.67.122-1.318.323-1.926l-.006-.129-3.188-2.426-.104.049A9.76 9.76 0 0 0 2.1 11.79c0 1.568.39 3.049 1.093 4.43l3.31-2.503Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 5.703c1.874 0 3.136.796 3.856 1.463l2.816-2.688C17.163 2.91 14.903 1.88 12.2 1.88c-3.945 0-7.362 2.301-9.007 5.478l3.298 2.507c.813-2.413 3.061-4.16 5.709-4.16Z"
        fill="#EB4335"
      />
    </svg>
  )
}

export default function AuthPage() {
  return (
    <section className="relative left-1/2 w-[min(1120px,calc(100vw-24px))] -translate-x-1/2 px-0 py-2 sm:w-[min(1180px,calc(100vw-48px))]">
      <Suspense
        fallback={
          <div className="h-[620px] w-full animate-pulse rounded-[30px] border border-border/40 bg-card/30" />
        }
      >
        <AuthContent />
      </Suspense>
    </section>
  )
}
