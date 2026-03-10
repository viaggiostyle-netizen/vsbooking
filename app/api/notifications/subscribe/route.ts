import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { subscribeTokenToAdminTopic } from "@/lib/firebase/admin"

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ message: "No autenticado." }, { status: 401 })
        }

        const { token } = await request.json()

        if (!token) {
            return NextResponse.json({ message: "Token requerido." }, { status: 400 })
        }

        const result = await subscribeTokenToAdminTopic(token)

        if (result.success) {
            return NextResponse.json({ message: "Suscrito exitosamente." })
        } else {
            return NextResponse.json({ message: result.error }, { status: 500 })
        }
    } catch (error: any) {
        console.error("API Subscribe Error:", error)
        return NextResponse.json({
            message: "Error interno del servidor.",
            error: error.message || String(error)
        }, { status: 500 })
    }
}
