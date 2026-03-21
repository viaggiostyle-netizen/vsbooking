import { requestAdminDevicePushToken } from "@/lib/firebase/client"

const PUSH_TOKEN_STORAGE_KEY = "admin_push_token"

export function getStoredAdminPushToken() {
    if (typeof window === "undefined") return null
    return localStorage.getItem(PUSH_TOKEN_STORAGE_KEY)
}

export async function enableAdminPushNotifications(options: { askPermission: boolean } = { askPermission: true }) {
    const token = await requestAdminDevicePushToken(options)

    if (token) {
        const stored = getStoredAdminPushToken()
        if (stored === token) return token

        const response = await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })

        if (response.ok) {
            localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token)
            return token
        }
    }

    return null
}

export async function disableAdminPushNotifications() {
    // Aquí opcionalmente podrías llamar a una API de unsubscribe si decides implementarla
    localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY)
}
