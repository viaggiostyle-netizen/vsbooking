"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LockKeyhole } from "lucide-react"
import AdminShell from "@/components/admin/AdminLayout"
import Sidebar, { type SidebarSection } from "@/components/admin/Sidebar"
import {
  disableAdminPushNotifications,
  enableAdminPushNotifications,
  getStoredAdminPushToken,
} from "@/lib/notifications/admin-handler"
import { listenAdminForegroundMessages } from "@/lib/firebase/client"
import { signIn, signOut, useSession } from "next-auth/react"
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleSlash2,
  Clock3,
  DollarSign,
  Grid3X3,
  LogOut,
  Menu,
  Moon,
  Percent,
  Plus,
  Scissors,
  Settings,
  Shield,
  Sun,
  UserRoundPlus,
  Users,
} from "lucide-react"

type AdminLayoutProps = {
  children: React.ReactNode
}

const primaryNavItems = [
  { label: "Dashboard", href: "/admin", icon: Grid3X3 },
  { label: "Calendario", href: "/admin/agenda", icon: CalendarDays },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Servicios", href: "/admin/servicios", icon: Scissors },
  { label: "Configuracion", href: "/admin/configuracion", icon: Settings },
]

const secondaryNavItems = [
  { label: "Ingresos", href: "/admin/ingresos", icon: DollarSign },
  { label: "Promociones", href: "/admin/promociones", icon: Percent },
  { label: "Horarios", href: "/admin/horarios", icon: Clock3 },
  { label: "Reglas", href: "/admin/reglas", icon: CircleSlash2 },
  { label: "Actividad", href: "/admin/actividad", icon: Activity },
  { label: "Admins", href: "/admin/admins", icon: Shield },
]

function formatCurrentDate() {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date())
}

function getInitial(value: string) {
  const clean = value.trim()
  if (!clean) return "A"
  return clean.charAt(0).toUpperCase()
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const [pushToken, setPushToken] = useState("")
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "enabled" | "blocked">("idle")
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const [isWhitelistedAdmin, setIsWhitelistedAdmin] = useState(false)
  const [isAccessVerified, setIsAccessVerified] = useState(false)
  const [accessCode, setAccessCode] = useState("")
  const [accessError, setAccessError] = useState("")
  const [isAccessChecking, setIsAccessChecking] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const activeTheme = theme === "system" ? resolvedTheme : theme
  const dark = mounted ? activeTheme === "dark" : true
  const currentDate = useMemo(() => formatCurrentDate(), [])
  const isAgendaSection = pathname.startsWith("/admin/agenda")
  const userName = session?.user?.name?.trim() || "Admin"
  const userEmail = session?.user?.email?.trim() || ""
  const userImage = session?.user?.image?.trim() || ""
  const userShortName = userName.split(" ")[0] || "Admin"
  const userInitial = getInitial(userName)
  const pushButtonLabel =
    pushStatus === "enabled"
      ? "Notificaciones activas"
      : pushStatus === "loading"
        ? "Activando notificaciones"
        : pushStatus === "blocked"
          ? "Notificaciones bloqueadas por el navegador"
          : "Activar notificaciones"
  const isPushEnabled = pushStatus === "enabled"
  const isPushLoading = pushStatus === "loading"
  const isPushBlocked = pushStatus === "blocked"

  const sidebarSections: SidebarSection[] = useMemo(
    () => [
      { id: "primary", items: primaryNavItems },
      { id: "secondary", items: secondaryNavItems },
    ],
    []
  )

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!userMenuOpen) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!userMenuRef.current) return
      const target = event.target
      if (target instanceof Node && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setUserMenuOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [userMenuOpen])

  const handleNewTurn = () => {
    if (isAgendaSection) {
      window.dispatchEvent(new Event("admin:open-manual-turn"))
      return
    }

    router.push("/admin/agenda?nuevo=1")
  }

  const handleSwitchAccount = () => {
    setUserMenuOpen(false)
    setIsAccessVerified(false)
    setAccessCode("")
    setAccessError("")
    void signIn("google", { callbackUrl: "/admin" }, { prompt: "select_account" })
  }

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    setIsAccessVerified(false)
    setAccessCode("")
    setAccessError("")
    const token = pushToken || getStoredAdminPushToken()
    if (token) {
      await disableAdminPushNotifications()
    }
    await signOut({ callbackUrl: "/auth" })
  }

  const handleEnablePush = async () => {
    if (status !== "authenticated" || !session?.user?.email) return
    setPushStatus("loading")

    const token = await enableAdminPushNotifications({ askPermission: true })
    if (token) {
      setPushToken(token)
      setPushStatus("enabled")
      return
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "denied") {
        setPushStatus("blocked")
        return
      }
    }

    setPushStatus("idle")
  }

  const handlePushToggle = async () => {
    if (isPushLoading) return
    if (isPushEnabled) return
    await handleEnablePush()
  }

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return

    let active = true
    void (async () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "denied") {
          if (active) setPushStatus("blocked")
          return
        }

        if (Notification.permission !== "granted") {
          if (active) setPushStatus("idle")
          return
        }
      }

      if (active) setPushStatus("loading")
      const token = await enableAdminPushNotifications({ askPermission: false })
      if (!active) return

      if (token) {
        setPushToken(token)
        setPushStatus("enabled")
      } else {
        setPushStatus("idle")
      }
    })()

    return () => {
      active = false
    }
  }, [status, session?.user?.email])

  useEffect(() => {
    if (status !== "authenticated") return

    let active = true
    let unsubscribe: (() => void) | null = null

    void (async () => {
      const stop = await listenAdminForegroundMessages((payload) => {
        if (typeof window === "undefined" || !("Notification" in window)) return
        if (Notification.permission !== "granted") return
        if (document.visibilityState !== "visible") return

        const title = payload.notification?.title?.trim() || "Nueva notificación"
        const body = payload.notification?.body?.trim() || ""
        const resolvedTitle = title || payload.data?.title?.trim() || "Nueva notificacion"
        const resolvedBody = body || payload.data?.body?.trim() || ""
        const icon = payload.notification?.icon || payload.data?.icon || "/icons/icon-light-192.png"
        const badge = payload.data?.badge || "/icons/notification-badge.svg"

        try {
          void resolvedTitle
          void resolvedBody
          void icon
          void badge
          return
        } catch {
          return
        }
      })

      if (!active) {
        stop?.()
        return
      }

      unsubscribe = stop
    })()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") {
      setIsWhitelistedAdmin(false)
      setIsAccessVerified(false)
      setAccessCode("")
      setAccessError("")
      return
    }

    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/auth/is-admin", { cache: "no-store", credentials: "include" })
        if (!response.ok) throw new Error("No se pudo validar el admin.")
        const payload = (await response.json()) as { isAdmin?: boolean }
        if (active) setIsWhitelistedAdmin(Boolean(payload.isAdmin))
      } catch {
        if (active) setIsWhitelistedAdmin(false)
      }
    })()

    return () => {
      active = false
    }
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") {
      setIsAccessVerified(false)
      return
    }

    if (!isWhitelistedAdmin) {
      setIsAccessVerified(false)
      return
    }
  }, [isWhitelistedAdmin, status])

  const handleAccessSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanCode = accessCode.trim()

    if (!/^\d{6}$/.test(cleanCode)) {
      setAccessError("Ingresá un código de 6 dígitos.")
      return
    }

    setIsAccessChecking(true)
    setAccessError("")

    try {
      const response = await fetch("/api/auth/admin-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode }),
      })

      const payload = (await response.json().catch(() => ({ ok: false, message: "No se pudo verificar el código." }))) as {
        ok?: boolean
        message?: string
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Código incorrecto.")
      }

      setIsAccessVerified(true)
      setAccessCode("")
      setAccessError("")
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "No se pudo verificar el código.")
    } finally {
      setIsAccessChecking(false)
    }
  }

  const renderSidebarFooter = (showLabels: boolean) => (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold text-muted transition-all duration-200 hover:bg-(--hover) hover:text-foreground"
    >
      {dark ? <Moon size={18} /> : <Sun size={18} />}
      <span
        className={`overflow-hidden transition-all ${showLabels ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
          }`}
      >
        {dark ? "Modo oscuro" : "Modo claro"}
      </span>
    </button>
  )

  const desktopSidebar = (
    <Sidebar
      sections={sidebarSections}
      activePath={pathname}
      collapsed={sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      onNavigate={() => setSidebarOpen(false)}
      footer={renderSidebarFooter}
      variant="desktop"
    />
  )

  const drawerSidebar = (
    <Sidebar
      sections={sidebarSections}
      activePath={pathname}
      collapsed={false}
      onNavigate={() => setSidebarOpen(false)}
      footer={renderSidebarFooter}
      variant="drawer"
    />
  )

  if (status === "authenticated" && isWhitelistedAdmin && !isAccessVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_55%)] px-4 py-10">
        <div className="w-full max-w-[420px] rounded-[28px] border border-border/70 bg-card/95 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:p-8">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-[color-mix(in_srgb,var(--background)_78%,transparent)] text-foreground">
            <LockKeyhole size={22} />
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            Acceso protegido
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Ingresá el código de 6 dígitos para entrar al panel de administración.
          </p>

          <form className="mt-6 space-y-3" onSubmit={handleAccessSubmit}>
            <label className="block text-sm font-semibold text-foreground" htmlFor="admin-access-code">
              Código de acceso
            </label>
            <input
              id="admin-access-code"
              name="admin-access-code"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-[16px] font-semibold tracking-[0.35em] text-foreground outline-none ring-0 focus:border-ring"
              placeholder="123456"
            />
            <button
              type="submit"
              disabled={isAccessChecking}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAccessChecking ? "Verificando..." : "Entrar al panel"}
            </button>
          </form>

          {accessError && <p className="mt-3 text-sm font-medium text-rose-500">{accessError}</p>}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminShell
      sidebar={desktopSidebar}
      drawerSidebar={drawerSidebar}
      isSidebarOpen={sidebarOpen}
      onCloseSidebar={() => setSidebarOpen(false)}
      contentKey={pathname}
      header={
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface bg-card text-foreground transition-colors hover:bg-[var(--hover)] lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Hoy</p>
              <p className="text-[15px] font-semibold capitalize leading-tight whitespace-nowrap text-foreground">
                {currentDate}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {isWhitelistedAdmin && (
              <Link
                href="/admin/configuracion"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-surface bg-card text-foreground transition-all duration-300 ease-in-out hover:bg-[var(--hover)] sm:hidden"
                aria-label="Configuracion"
                title="Configuracion"
              >
                <Settings size={18} />
              </Link>
            )}
            <button
              type="button"
              onClick={handleNewTurn}
              className="button-primary inline-flex h-10 !w-auto items-center justify-center gap-2 px-3 sm:px-4 !mt-0 text-sm"
              aria-label="Nuevo turno"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nuevo turno</span>
            </button>

            <button
              type="button"
              onClick={() => void handlePushToggle()}
              disabled={isPushLoading}
              className={`admin-push-toggle ${isPushEnabled ? "is-enabled" : ""} ${isPushBlocked ? "is-blocked" : ""} ${isPushLoading ? "is-loading" : ""}`}
              aria-label={pushButtonLabel}
              aria-pressed={isPushEnabled}
              title={pushButtonLabel}
            >
              <span className="admin-push-toggle__track" aria-hidden="true">
                <span className="admin-push-toggle__status">
                  <Check size={18} strokeWidth={3.25} className="admin-push-toggle__check" />
                </span>
                <span className="admin-push-toggle__thumb">
                  <Bell size={16} strokeWidth={2.25} className="admin-push-toggle__bell" />
                </span>
              </span>
              <span className="sr-only">{pushButtonLabel}</span>
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface bg-card px-2.5 text-sm font-semibold text-foreground transition-all duration-300 ease-in-out hover:bg-[var(--hover)]"
                aria-label="Menu de usuario"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full border border-surface bg-[var(--hover)] text-[10px] font-bold uppercase"
                  style={
                    userImage
                      ? {
                        backgroundImage: `url("${userImage}")`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                      }
                      : undefined
                  }
                >
                  {userImage ? (
                    <span className="sr-only">{userName}</span>
                  ) : (
                    userInitial
                  )}
                </span>
                <span className="hidden max-w-[96px] truncate sm:inline">{userShortName}</span>
                <ChevronDown size={15} className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[240px] overflow-hidden rounded-2xl border border-surface bg-card p-2 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                    {userEmail && <p className="mt-0.5 truncate text-xs text-muted">{userEmail}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-muted transition-colors hover:bg-[var(--hover)] hover:text-foreground"
                  >
                    <UserRoundPlus size={16} />
                    Cambiar cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSignOut()
                    }}
                    className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-muted transition-colors hover:bg-[var(--hover)] hover:text-foreground"
                  >
                    <LogOut size={16} />
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </AdminShell>
  )
}
