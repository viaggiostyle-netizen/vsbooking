import { NextResponse } from "next/server"
import { validateBookingContact } from "@/lib/validation/booking"

type ValidateBookingBody = {
  name?: string
  phone?: string
  email?: string
  website?: string
}

export async function POST(req: Request) {
  let body: ValidateBookingBody

  try {
    body = (await req.json()) as ValidateBookingBody
  } catch {
    return NextResponse.json(
      { message: "Payload inválido." },
      { status: 400 }
    )
  }

  const result = validateBookingContact({
    name: body.name ?? "",
    phone: body.phone ?? "",
    email: body.email ?? "",
  })

  if ((body.website ?? "").trim().length > 0) {
    return NextResponse.json(
      { message: "Solicitud inválida." },
      { status: 400 }
    )
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        message: "Datos inválidos.",
        errors: {
          name: result.name.valid ? null : result.name.message,
          phone: result.phone.valid ? null : result.phone.message,
          email: result.email.valid ? null : result.email.message,
        },
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    data: {
      name: result.name.normalized,
      phone: result.phone.normalized,
      email: result.email.normalized,
    },
  })
}
