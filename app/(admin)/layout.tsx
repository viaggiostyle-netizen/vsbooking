"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import Logo from "@/components/branding/Logo"
import AdminHeader from "@/components/layout/AdminHeader"
import {
  disableAdminPushNotifications,
  enableAdminPushNotifications,
  getStoredAdminPushToken,
} from "@/lib/notifications/admin-handler"
import { listenAdminForegroundMessages } from "@/lib/firebase/client"
import { signIn, signOut, useSession } from "next-auth/react"
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleSlash2,
  Clock3,
  DollarSign,
  Grid3X3,
  LogOut,
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
import { AnimatePresence, motion } from "framer-motion"

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

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))
}

function getInitial(value: string) {
  const clean = value.trim()
  if (!clean) return "A"
  return clean.charAt(0).toUpperCase()
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  active: boolean
}) {
  return (
    <Link href={href} className="relative block">
      <motion.div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors duration-300 ease-in-out ${
          active ? "text-[var(--accent)]" : "text-muted hover:text-foreground"
        }`}
        whileHover={{ scale: 1.02, x: 2 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        aria-current={active ? "page" : undefined}
      >
        <span className="relative flex h-7 w-7 items-center justify-center">
          {active && (
            <motion.span
              layoutId="sidebar-icon-glow"
              className="absolute inset-0 rounded-full bg-[var(--accent)]/15 blur-[6px]"
            />
          )}
          <Icon
            size={18}
            className={active ? "relative text-[var(--accent)]" : "relative text-muted"}
          />
        </span>
        <span className="relative">
          {active && (
            <motion.span
              layoutId="sidebar-label-underline"
              className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-[var(--accent)]/60"
            />
          )}
          <span>{label}</span>
        </span>
      </motion.div>
      <AnimatePresence initial={false}>
        {active && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="pointer-events-none absolute inset-y-1 left-2 right-2 -z-10 rounded-2xl bg-[var(--hover)]"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </Link>
  )
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
    void signIn("google", { callbackUrl: "/admin" }, { prompt: "select_account" })
  }

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    const token = pushToken || getStoredAdminPushToken()
    if (token) {
      await disableAdminPushNotifications(token)
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

        try {
          new Notification(title, { body, icon: "/1.png" })
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



  return (
    <div className="admin-shell flex min-h-screen bg-background text-foreground">
      <aside className="admin-sidebar sidebar hidden w-[280px] shrink-0 border-r border-surface bg-sidebar lg:flex lg:flex-col">
        <div className="admin-sidebar-header sidebar-divider border-b bg-sidebar">
          <div className="flex h-[72px] items-center px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-surface bg-card/40">
                <Logo size={56} className="h-full w-full rounded-full object-cover" />
              </span>
              <div>
                <p className="text-lg font-bold leading-none text-foreground">ViaggioStyle</p>
                <p className="mt-1 text-xs font-medium text-muted">Turnos Dashboard</p>
              </div>
            </Link>
          </div>
        </div>

        <nav className="space-y-1 px-4 py-5">
          {primaryNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isItemActive(pathname, item.href)}
            />
          ))}
        </nav>

        <div className="sidebar-divider mx-0" />

        <nav className="space-y-1 px-4 pt-4 pb-5">
          {secondaryNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isItemActive(pathname, item.href)}
            />
          ))}
        </nav>

        <div className="sidebar-divider mx-0" />

        <div className="mt-auto space-y-1 px-4 py-4">
          <button
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold text-muted transition-all duration-300 ease-in-out hover:bg-[var(--hover)] hover:text-foreground"
          >
            {dark ? <Moon size={18} /> : <Sun size={18} />}
            {dark ? "Modo oscuro" : "Modo claro"}
          </button>
        </div>
      </aside>

      <div className="admin-content min-w-0 flex-1 overflow-x-hidden bg-background">
        <AdminHeader>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="hidden md:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Hoy</p>
              <p className="text-[15px] font-semibold capitalize leading-tight whitespace-nowrap text-foreground">
                {currentDate}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewTurn}
                className="button-primary inline-flex h-10 w-auto items-center gap-2 px-4 !mt-0 text-sm"
              >
                <Plus size={15} />
                Nuevo turno
              </button>

              <button
                type="button"
                onClick={() => void handleEnablePush()}
                className={`inline-flex h-10 items-center justify-center rounded-xl border border-surface px-3 transition-all duration-300 ease-in-out active:scale-[0.98] ${pushStatus === "enabled"
                  ? "bg-[var(--accent)] text-white hover:bg-[var(--accent)]"
                  : pushStatus === "blocked"
                    ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                    : "bg-card text-foreground hover:bg-[var(--hover)]"
                  }`}
                aria-label={pushButtonLabel}
                title={pushButtonLabel}
              >
                <Bell size={18} className={pushStatus === "loading" ? "animate-pulse" : ""} />
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
                  <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full border border-surface bg-[var(--hover)] text-[10px] font-bold uppercase">
                    {userImage ? (
                      <img src={userImage} alt={userName} className="h-full w-full object-cover" />
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
        </AdminHeader>

        <main className="min-w-0">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
