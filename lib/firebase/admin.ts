import admin from "firebase-admin"

const DEFAULT_NOTIFICATION_ICON = "/icons/icon-light-192.png"

function getAdminConfig() {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (privateKey) {
        // Handle extra quotes if they exist
        privateKey = privateKey.replace(/^"|"$/g, '')
        // Handle double-escaped or literal newlines
        privateKey = privateKey.replace(/\\n/g, "\n")
    }

    if (!projectId || !clientEmail || !privateKey) {
        console.error("Missing Firebase Admin variables:", {
            projectId: !!projectId,
            clientEmail: !!clientEmail,
            privateKey: !!privateKey
        })
        return null
    }

    return {
        projectId,
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    }
}

export function getFirebaseAdmin() {
    const config = getAdminConfig()
    if (!config) {
        console.error("Firebase Admin Config is missing required variables.")
        return null
    }

    try {
        if (admin.apps.length === 0) {
            admin.initializeApp(config)
            console.log("Firebase Admin initialized successfully")
        }
        return admin
    } catch (error) {
        console.error("Error during Firebase Admin initialization:", error)
        return null
    }
}

export async function subscribeTokenToAdminTopic(token: string) {
    const fb = getFirebaseAdmin()
    if (!fb) return { success: false, error: "Firebase Admin not configured" }

    try {
        const response = await fb.messaging().subscribeToTopic(token, "admin-updates")
        return { success: true, response }
    } catch (error) {
        console.error("Error subscribing to topic:", error)
        return { success: false, error: String(error) }
    }
}

export async function notifyAdminTopic(title: string, body: string, data?: Record<string, string>) {
    const fb = getFirebaseAdmin()
    if (!fb) return { success: false, error: "Firebase Admin not configured" }

    try {
        const payloadData = {
            ...(data || {}),
            title,
            body,
            icon: DEFAULT_NOTIFICATION_ICON,
        }

        const message = {
            notification: { title, body },
            topic: "admin-updates",
            data: payloadData,
            webpush: {
                notification: {
                    title,
                    body,
                    icon: DEFAULT_NOTIFICATION_ICON,
                    badge: DEFAULT_NOTIFICATION_ICON,
                },
            },
        }
        const response = await fb.messaging().send(message)
        return { success: true, response }
    } catch (error) {
        console.error("Error sending notification:", error)
        return { success: false, error: String(error) }
    }
}
