import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import {
  checkIfEmailIsAdmin,
  countAdmins,
  getAdminById,
  insertAdmin,
  isValidGmail,
  listAdmins,
  normalizeEmail,
  removeAdmin,
} from "@/lib/auth/admins"
import { logAdminAction } from "@/lib/admin-logs"
import { authOptions } from "@/lib/auth/options"

type AuthCheck =
  | {
      email: string
    }
  | {
      response: NextResponse
    }

async function ensureAuthorizedAdmin(): Promise<AuthCheck> {
  const session = await getServerSession(authOptions)
  const email = normalizeEmail(session?.user?.email)

  if (!email) {
    return { response: NextResponse.json({ message: "No autenticado." }, { status: 401 }) }
  }

  const isAuthorized = await checkIfEmailIsAdmin(email)
  if (!isAuthorized) {
    return { response: NextResponse.json({ message: "Not Found" }, { status: 404 }) }
  }

  return { email }
}

export async function GET() {
  const auth = await ensureAuthorizedAdmin()
  if ("response" in auth) return auth.response

  try {
    const admins = await listAdmins()
    return NextResponse.json({ admins })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener la lista de admins."
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await ensureAuthorizedAdmin()
  if ("response" in auth) return auth.response

  try {
    const body = (await req.json()) as { email?: string }
    const email = normalizeEmail(body?.email)

    if (!isValidGmail(email)) {
      return NextResponse.json({ message: "Ingresa un Gmail valido." }, { status: 400 })
    }

    const admin = await insertAdmin(email)

    void logAdminAction({
      action: "admin_added",
      actorEmail: auth.email,
      targetLabel: admin.email,
    })

    return NextResponse.json({ admin }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo agregar el administrador."
    const status = message.includes("ya tiene acceso") ? 409 : 500
    return NextResponse.json({ message }, { status })
  }
}

export async function DELETE(req: Request) {
  const auth = await ensureAuthorizedAdmin()
  if ("response" in auth) return auth.response

  try {
    const body = (await req.json()) as { id?: string }
    const id = body?.id?.trim()

    if (!id) {
      return NextResponse.json({ message: "ID invalido." }, { status: 400 })
    }

    const targetAdmin = await getAdminById(id)
    if (!targetAdmin) {
      return NextResponse.json({ message: "Administrador no encontrado." }, { status: 404 })
    }

    const totalAdmins = await countAdmins()
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { message: "No se puede eliminar el ultimo administrador." },
        { status: 400 }
      )
    }

    if (normalizeEmail(targetAdmin.email) === auth.email) {
      return NextResponse.json(
        { message: "No podes eliminar tu propio acceso desde esta cuenta." },
        { status: 400 }
      )
    }

    await removeAdmin(id)

    void logAdminAction({
      action: "admin_removed",
      actorEmail: auth.email,
      targetLabel: normalizeEmail(targetAdmin.email),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el administrador."
    return NextResponse.json({ message }, { status: 500 })
  }
}
