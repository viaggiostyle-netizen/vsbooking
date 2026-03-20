"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock3, MessageSquare, Phone, Save } from "lucide-react"
import { useSettings } from "@/context/SettingsContext"
import { showErrorToast, showSuccessToast } from "@/components/ui/app-toast"
import { buildWhatsappUrl, evaluateCancellationRule } from "@/lib/rulesUtils"

export default function ReglasPage() {
  const { settings, updateSettings } = useSettings()
  const [minHours, setMinHours] = useState(String(settings.cancellationMinHours))
  const [blockedMessage, setBlockedMessage] = useState(settings.cancellationBlockedMessage)
  const [whatsappContact, setWhatsappContact] = useState(settings.whatsappContact)
  const [feedback, setFeedback] = useState("")
  const [previewSample] = useState(() => buildPreviewSampleDateTime())

  const preview = useMemo(() => {
    return evaluateCancellationRule(previewSample.date, previewSample.time, {
      ...settings,
      cancellationMinHours: Number(minHours) || 0,
      cancellationBlockedMessage: blockedMessage.trim(),
      whatsappContact: whatsappContact.trim(),
    })
  }, [settings, minHours, blockedMessage, whatsappContact, previewSample])

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings/cancellation", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("No se pudo obtener la configuracion de cancelacion.")
        }
        const payload = (await response.json()) as { hours?: number }
        const hours = Number(payload.hours)
        if (Number.isFinite(hours) && hours > 0) {
          updateSettings({ cancellationMinHours: Math.floor(hours) })
          setMinHours(String(Math.floor(hours)))
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo obtener la configuracion de cancelacion."
        setFeedback(message)
        showErrorToast(message, { title: "No se pudo cargar la regla" })
      }
    })()
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveRules = () => {
    const parsedHours = Number(minHours)
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      const message = "Ingresa una cantidad valida de horas (mayor a 0)."
      setFeedback(message)
      showErrorToast(message, { title: "Horas invalidas" })
      return
    }

    if (!blockedMessage.trim()) {
      const message = "El mensaje de bloqueo es obligatorio."
      setFeedback(message)
      showErrorToast(message, { title: "Mensaje obligatorio" })
      return
    }

    updateSettings({
      cancellationMinHours: Math.floor(parsedHours),
      cancellationBlockedMessage: blockedMessage.trim(),
      whatsappContact: whatsappContact.trim(),
    })

    void (async () => {
      try {
        const response = await fetch("/api/settings/cancellation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hours: Math.floor(parsedHours) }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null
          throw new Error(payload?.message ?? "No se pudo guardar la configuracion.")
        }

        const message = "Cambios guardados correctamente."
        setFeedback(message)
        showSuccessToast(message, { title: "Reglas actualizadas" })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo guardar la configuracion."
        setFeedback(message)
        showErrorToast(message, { title: "No se pudo guardar" })
      }
    })()
  }

  const whatsappUrl = buildWhatsappUrl(whatsappContact)

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
          Politicas
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Reglas de cancelacion</h1>
        <p className="mt-1 text-sm text-muted">
          Define tiempos y mensajes para mantener la agenda bajo control.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="admin-panel p-6">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 size={16} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Tiempo minimo de anticipacion</h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Si faltan menos horas que este valor, el cliente no podra cancelar online.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={minHours}
              onChange={(event) => setMinHours(event.target.value)}
              className="h-11 w-[140px] rounded-2xl border border-surface bg-card px-4 text-sm font-semibold outline-none transition-colors duration-200 ease-out focus:border-[var(--accent)]"
            />
            <span className="text-sm text-muted">horas antes de la cita</span>
          </div>
        </article>

        <article className="admin-panel p-6">
          <div className="mb-3 flex items-center gap-2">
            <Phone size={16} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">WhatsApp de contacto</h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Numero al que se enviara al cliente cuando la cancelacion este bloqueada.
          </p>

          <input
            value={whatsappContact}
            onChange={(event) => setWhatsappContact(event.target.value)}
            placeholder="+5491112345678"
            className="h-11 w-full rounded-2xl border border-surface bg-card px-4 text-sm font-semibold outline-none transition-colors duration-200 ease-out focus:border-[var(--accent)]"
          />

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] underline"
            >
              Abrir enlace de WhatsApp
            </a>
          )}
        </article>

        <article className="admin-panel p-6 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Mensaje cuando no se puede cancelar</h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Este texto se mostrara en la app cuando la cancelacion no este permitida.
          </p>

          <textarea
            rows={4}
            value={blockedMessage}
            onChange={(event) => setBlockedMessage(event.target.value)}
            className="w-full resize-none rounded-2xl border border-surface bg-card px-4 py-3 text-sm outline-none transition-colors duration-200 ease-out focus:border-[var(--accent)]"
          />
        </article>
      </div>

      <article className="admin-panel mt-4 p-6">
        <h3 className="text-base font-semibold">Vista previa de bloqueo</h3>
        <p className="mt-2 text-sm text-muted">
          {preview.message ?? "La cancelacion quedaria permitida para este caso de ejemplo."}
        </p>
      </article>

      <button onClick={saveRules} className="button-primary mt-4 inline-flex items-center justify-center gap-2 !w-auto px-6">
        <Save size={15} />
        Guardar cambios
      </button>

      {feedback && <p className="mt-2 text-sm text-muted">{feedback}</p>}
    </section>
  )
}

function buildPreviewSampleDateTime() {
  const future = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(
    future.getDate()
  ).padStart(2, "0")}`
  const time = `${String(future.getHours()).padStart(2, "0")}:${String(future.getMinutes()).padStart(2, "0")}`

  return { date, time }
}
