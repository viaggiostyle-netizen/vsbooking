import { NextResponse } from "next/server"
import { notifyAdminTopic } from "@/lib/firebase/admin"

export async function POST(request: Request) {
    try {
        const { eventType, clientName, service, date, time, previousDate, previousTime } = await request.json()

        let title = ""
        let body = ""

        switch (eventType) {
            case "created":
                title = "🆕 Nuevo Turno"
                body = `${clientName} reservó ${service} para el ${date} a las ${time}`
                break
            case "modified":
                title = "✏️ Turno Modificado"
                body = `${clientName} cambió su turno del ${previousDate} ${previousTime} al ${date} ${time}`
                break
            case "cancelled":
                title = "❌ Turno Cancelado"
                body = `${clientName} canceló su turno de ${service} el ${date} a las ${time}`
                break
            default:
                title = "Notificación de Turno"
                body = "Hubo un cambio en los turnos."
        }

        const result = await notifyAdminTopic(title, body, {
            click_action: "/admin/agenda",
            eventType,
        })

        if (result.success) {
            return NextResponse.json({ message: "Notificación enviada." })
        } else {
            return NextResponse.json({ message: result.error }, { status: 500 })
        }
    } catch (error) {
        console.error("API Trigger Error:", error)
        return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 })
    }
}
