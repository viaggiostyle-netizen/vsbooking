import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { checkIfEmailIsAdmin } from "@/lib/auth/admins"

function buildUrl(path: string, req: NextRequest) {
  return new URL(path, req.url)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const secret = process.env.NEXTAUTH_SECRET
  const token = await getToken({ req, secret })
  const homeUrl = buildUrl("/", req)

  if (pathname.startsWith("/admin")) {
    if (!token?.email) {
      return NextResponse.redirect(homeUrl)
    }

    const isAuthorized = await checkIfEmailIsAdmin(String(token.email))
    if (!isAuthorized) {
      return NextResponse.redirect(homeUrl)
    }
  }

  if (pathname.startsWith("/auth")) {
    if (token?.email) {
      const isAuthorized = await checkIfEmailIsAdmin(String(token.email))

      if (isAuthorized) {
        return NextResponse.redirect(buildUrl("/admin", req))
      }

      return NextResponse.redirect(homeUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/auth"],
}
