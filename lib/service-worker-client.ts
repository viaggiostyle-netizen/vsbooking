"use client"

const APP_SERVICE_WORKER_PATH = "/sw.js"
const LEGACY_SERVICE_WORKER_PATHS = new Set(["/firebase-messaging-sw.js"])

function getRegistrationScriptPath(registration: ServiceWorkerRegistration) {
  const worker =
    registration.active ??
    registration.waiting ??
    registration.installing ??
    null

  if (!worker?.scriptURL) return ""

  try {
    return new URL(worker.scriptURL).pathname
  } catch {
    return worker.scriptURL
  }
}

async function cleanupLegacyServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations().catch(() => [])

  await Promise.all(
    registrations
      .filter((registration) => LEGACY_SERVICE_WORKER_PATHS.has(getRegistrationScriptPath(registration)))
      .map((registration) => registration.unregister())
  )
}

export async function registerAppServiceWorker() {
  if (typeof window === "undefined") return null
  if (!("serviceWorker" in navigator)) return null

  const registration = await navigator.serviceWorker
    .register(APP_SERVICE_WORKER_PATH, { scope: "/" })
    .catch(() => null)

  if (!registration) return null

  await cleanupLegacyServiceWorkers()

  return navigator.serviceWorker.ready.catch(() => registration)
}
