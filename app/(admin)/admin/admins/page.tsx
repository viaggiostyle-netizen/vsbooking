"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, Plus, Shield, Trash2 } from "lucide-react"
import { toast } from "react-toastify"

type AdminRecord = {
  id: string
  email: string
  created_at: string
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState("")
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")

  const canSubmit = useMemo(() => /^[a-z0-9._%+-]+@gmail\.com$/i.test(email.trim()), [email])

  useEffect(() => {
    void loadAdmins()
  }, [])

  async function loadAdmins() {
    setLoading(true)
    setError("")
    setFeedback("")

    try {
      const response = await fetch("/api/admins", { cache: "no-store" })
      if (response.status === 404) {
        window.location.href = "/404"
        return
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? "No se pudo cargar la lista de administradores.")
      }

      const payload = (await response.json()) as { admins: AdminRecord[] }
      setAdmins(payload.admins)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  function handlePreSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[a-z0-9._%+-]+@gmail\.com$/i.test(normalizedEmail)) {
      setError("Ingresa un Gmail valido para otorgar acceso.")
      return
    }

    setError("")
    setPendingEmail(normalizedEmail)
    setShowConfirm(true)
  }

  async function handleConfirmAdd() {
    setSaving(true)
    setError("")
    setFeedback("")

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; admin?: AdminRecord }
        | null

      if (!response.ok || !payload?.admin) {
        throw new Error(payload?.message ?? "No se pudo agregar el administrador.")
      }

      setAdmins((current) => [payload.admin as AdminRecord, ...current])
      setFeedback("Administrador agregado correctamente.")
      toast.success("Administrador agregado correctamente.")
      setEmail("")
      setPendingEmail("")
      setShowConfirm(false)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Error inesperado."
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const previous = admins
    setAdmins((current) => current.filter((admin) => admin.id !== id))
    setError("")
    setFeedback("")

    try {
      const response = await fetch("/api/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? "No se pudo eliminar el administrador.")
      }

      setFeedback("Administrador eliminado.")
      toast.success("Administrador eliminado.")
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Error inesperado."
      setAdmins(previous)
      setError(message)
      toast.error(message)
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1080px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Seguridad</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Administrar admins</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Controla que correos tienen acceso al panel de administracion.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <motion.article
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="glass-card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]">
              <Shield size={16} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/85">
              Agregar administrador
            </h2>
          </div>

          <form onSubmit={handlePreSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted/80"
              >
                Gmail
              </label>
              <input
                id="admin-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@gmail.com"
                className="h-11 w-full rounded-2xl border border-border/40 bg-card/60 px-4 text-sm font-medium outline-none transition-colors duration-200 ease-out focus:border-[var(--accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || saving}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all duration-200 ease-out ${
                canSubmit && !saving
                  ? "bg-[var(--accent)] text-white hover:scale-[1.01] hover:bg-[var(--accent-strong)] hover:shadow-[0_10px_24px_rgba(37,99,235,0.24)]"
                  : "cursor-not-allowed bg-muted/15 text-muted/50"
              }`}
            >
              <Plus size={15} />
              Agregar administrador
            </button>
          </form>

          {feedback && <p className="mt-3 text-sm font-medium text-emerald-500">{feedback}</p>}
          {error && <p className="mt-3 text-sm font-medium text-rose-500">{error}</p>}
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
          className="glass-card p-5"
        >
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground/85">
            Admins autorizados
          </h2>

          {loading ? (
            <div className="rounded-2xl border border-border/30 bg-card/40 px-4 py-8 text-center text-sm text-muted">
              Cargando administradores...
            </div>
          ) : admins.length === 0 ? (
            <div className="rounded-2xl border border-border/30 bg-card/40 px-4 py-8 text-center text-sm text-muted">
              No hay administradores cargados.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {admins.map((admin) => (
                  <motion.article
                    key={admin.id}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex items-center justify-between rounded-2xl border border-border/35 bg-card/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{admin.email}</p>
                      <p className="mt-0.5 text-xs text-muted">Creado: {formatDate(admin.created_at)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDelete(admin.id)}
                      className="ml-3 grid h-9 w-9 place-items-center rounded-xl text-rose-500/60 transition-colors duration-200 ease-out hover:bg-rose-500/10 hover:text-rose-500"
                      aria-label={`Eliminar ${admin.email}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.article>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/35 backdrop-blur-[20px]"
              onClick={() => setShowConfirm(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 w-full max-w-[520px] rounded-2xl border border-border/50 bg-card/70 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-[20px]"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-500">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Otorgar acceso de administrador</h3>
                  <p className="mt-1 text-sm font-medium text-muted">{pendingEmail}</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted">
                Este correo tendra acceso completo al panel de administracion. Podra ver,
                modificar y gestionar toda la informacion del sistema. Confirmas que entendes
                las implicancias de esta accion?
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="h-10 rounded-xl border border-border/40 px-4 text-sm font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-card"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleConfirmAdd()}
                  className={`h-10 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ease-out ${
                    saving
                      ? "cursor-not-allowed bg-muted/20 text-muted"
                      : "bg-[var(--accent)] text-white hover:scale-[1.01] hover:bg-[var(--accent-strong)]"
                  }`}
                >
                  Entiendo lo que hago, avanzar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
