import { getApp, getApps, initializeApp } from "firebase/app"
import {
    getMessaging,
    getToken,
    isSupported,
    onMessage,
    type MessagePayload,
} from "firebase/messaging"
import { registerAppServiceWorker } from "@/lib/service-worker-client"

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

const hasFirebaseClientConfig =
    Boolean(firebaseConfig.apiKey) &&
    Boolean(firebaseConfig.authDomain) &&
    Boolean(firebaseConfig.projectId) &&
    Boolean(firebaseConfig.messagingSenderId) &&
    Boolean(firebaseConfig.appId)

function getFirebaseApp() {
    if (!hasFirebaseClientConfig) {
        throw new Error("Firebase client no configurado en entorno.")
    }
    return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

async function getMessagingRegistration() {
    return registerAppServiceWorker()
}

type RequestPushTokenOptions = {
    askPermission?: boolean
}

export async function requestAdminDevicePushToken(options: RequestPushTokenOptions = {}) {
    const { askPermission = true } = options

    console.log("Solicitando Token FCM...");

    if (typeof window === "undefined") return null
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        console.warn("Navegador no soporta notificaciones o SW");
        return null
    }

    if (!hasFirebaseClientConfig || !VAPID_PUBLIC_KEY) {
        console.error("Falta configuración de Firebase o VAPID Key", { hasConfig: hasFirebaseClientConfig, hasVapid: !!VAPID_PUBLIC_KEY });
        return null
    }

    const supported = await isSupported().catch(() => false)
    if (!supported) {
        console.warn("FCM no es soportado en este navegador");
        return null
    }

    const permission =
        Notification.permission === "granted"
            ? "granted"
            : askPermission
                ? await Notification.requestPermission()
                : Notification.permission

    console.log("Permiso de notificaciones:", permission);

    if (permission !== "granted") return null

    const registration = await getMessagingRegistration()
    if (!registration) {
        console.error("No se pudo registrar/obtener el Service Worker");
        return null
    }

    console.log("Solicitando Token a Google con VAPID...");
    const token = await getToken(getMessaging(getFirebaseApp()), {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: registration,
    }).catch((err) => {
        console.error("Error al obtener Token FCM:", err)
        return ""
    })

    if (token) {
        console.log("Token FCM obtenido exitosamente");
    }

    return token || null
}

export async function listenAdminForegroundMessages(
    onPayload: (payload: MessagePayload) => void
) {
    if (typeof window === "undefined") return null
    if (!hasFirebaseClientConfig) return null

    const supported = await isSupported().catch(() => false)
    if (!supported) return null

    return onMessage(getMessaging(getFirebaseApp()), onPayload)
}
