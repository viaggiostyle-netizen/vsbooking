import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { checkIfEmailIsAdmin, normalizeEmail } from "@/lib/auth/admins"

// Explicit session configuration values (seconds)
const SESSION_MAX_AGE = 24 * 60 * 60 // 24 hours
const SESSION_UPDATE_AGE = 60 * 60 // 1 hour

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
    // Explicitly define session lifetime to avoid implicit/undocumented defaults
    maxAge: SESSION_MAX_AGE,
    // How often to update the session age — used to rotate tokens server-side
    updateAge: SESSION_UPDATE_AGE,
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
      // Normalize email into the token
      if (user?.email) {
        token.email = normalizeEmail(user.email)
      } else if (token.email) {
        token.email = normalizeEmail(String(token.email))
      }

      // Ensure token contains creation and expiration timestamps so callers can
      // detect imminent expiry and react (client-side revalidation / UX)
      const now = Math.floor(Date.now() / 1000)
      if (!token.iat) token.iat = now
      if (!token.exp) token.exp = (token.iat as number) + SESSION_MAX_AGE

      return token
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = String(token.email)
      }

      // Expose expiry metadata to the session object for client-side checks
      try {
        const exp = (token as any).exp
        if (exp) (session as any).expiresAt = Number(exp)
      } catch (e) {
        // no-op
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
  events: {
    async signIn({ user }) {
      try {
        console.info(`[auth] signIn ${user?.email ?? "unknown"}`)
      } catch (e) {}
    },
    async signOut() {
      try {
        console.info("[auth] signOut")
      } catch (e) {}
    },
    async session({ session }) {
      try {
        console.debug(`[auth] session event for ${session?.user?.email ?? "unknown"}`)
      } catch (e) {}
    },
    async error({ error }) {
      try {
        console.error("[auth] error", error)
      } catch (e) {}
    },
  },
  logger: {
    error(code, ...metadata) {
      console.error("[next-auth][error]", code, ...metadata)
    },
    warn(code, ...metadata) {
      console.warn("[next-auth][warn]", code, ...metadata)
    },
    debug(code, ...metadata) {
      // Keep debug logs under explicit control; still available in server logs
      console.debug("[next-auth][debug]", code, ...metadata)
    },
  },
}
