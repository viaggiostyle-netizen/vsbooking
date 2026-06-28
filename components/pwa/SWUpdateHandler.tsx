"use client"

import { useEffect, useState } from "react"
import { registerAppServiceWorker } from "@/lib/service-worker-client"

export default function SWUpdateHandler() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      const reg = await registerAppServiceWorker()
      if (!mounted || !reg) return
      setRegistration(reg)

      // If there's already a waiting worker, show update UI
      if ((reg as any).waiting) {
        setUpdateAvailable(true)
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && (reg as any).waiting) {
            setUpdateAvailable(true)
          }
        })
      })

      navigator.serviceWorker.addEventListener("message", (evt) => {
        try {
          const data = (evt as MessageEvent).data || {}
          if (data && data.type === "SW_ACTIVATED") {
            // Optional: notify user that a new SW is active
            console.info("[sw] activated", data.version)
          }
        } catch (e) {}
      })
    }

    void init()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!registration) return

    // When controller changes, reload to use the new SW
    const onControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
  }, [registration])

  function applyUpdate() {
    const waiting = (registration as any)?.waiting as ServiceWorker | undefined
    if (!waiting) return
    // Ask the waiting worker to skip waiting and become active
    waiting.postMessage({ type: "SKIP_WAITING" })
  }

  if (!updateAvailable) return null

  return (
    <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 9999 }}>
      <div style={{ background: "#111", color: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.2)" }}>
        <div style={{ marginBottom: 8 }}>Nueva versión disponible</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setUpdateAvailable(false)} style={{ padding: "6px 10px" }}>Cerrar</button>
          <button onClick={applyUpdate} style={{ padding: "6px 10px", background: "#0b5cff", color: "white", border: "none", borderRadius: 4 }}>Actualizar ahora</button>
        </div>
      </div>
    </div>
  )
}
