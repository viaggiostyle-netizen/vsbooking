import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { checkIfEmailIsAdmin, normalizeEmail } from "@/lib/auth/admins"

function readEnv(name: string) {
  const value = process.env[name]?.trim() ?? ""
  if (!value) return ""
  if (value.startsWith("YOUR_")) return ""
  if (value.includes("missing-")) return ""
  return value
}

const googleClientId = readEnv("GOOGLE_CLIENT_ID")
const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET")
const hasGoogleOAuth = Boolean(googleClientId && googleClientSecret)

if (!hasGoogleOAuth) {
  console.warn(
    "[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados. Configuralos en .env.local para habilitar Google OAuth."
  )
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
    error: "/404",
  },
  providers: hasGoogleOAuth
    ? [
        GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user }) {
      const email = normalizeEmail(user.email)
      if (!email) return false
      return checkIfEmailIsAdmin(email)
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = normalizeEmail(user.email)
      } else if (token.email) {
        token.email = normalizeEmail(String(token.email))
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = String(token.email)
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
}
