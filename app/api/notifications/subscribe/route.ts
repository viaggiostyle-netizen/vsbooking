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

    const body = (await request.json()) as { token?: unknown }
    const token = typeof body.token === "string" ? body.token.trim() : ""

    if (!token) {
      return NextResponse.json({ message: "Token requerido." }, { status: 400 })
    }

    const result = await subscribeTokenToAdminTopic(token)

    if (result.success) {
      return NextResponse.json({ message: "Suscrito exitosamente." })
    }

    return NextResponse.json({ message: result.error }, { status: 500 })
  } catch (error: unknown) {
    console.error("API Subscribe Error:", error)
    return NextResponse.json(
      {
        message: "Error interno del servidor.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
