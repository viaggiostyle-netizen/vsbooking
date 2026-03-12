import "./globals.css"
import { DM_Sans, Playfair_Display } from "next/font/google"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "next-themes"
import PwaBootstrap from "@/components/pwa/PwaBootstrap"
import Providers from "./providers"
import { AppToastProvider } from "@/components/ui/ToastProvider"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ViaggioStyle",
  description: "Sistema profesional de turnos",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      {
        url: "/icons/icon-light-192.png",
        sizes: "192x192",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/icon-light-512.png",
        sizes: "512x512",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/icon-dark-192.png",
        sizes: "192x192",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icons/icon-dark-512.png",
        sizes: "512x512",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/icons/icon-dark-512.png", sizes: "512x512", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ViaggioStyle",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
    date: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers>{children}</Providers>
          <AppToastProvider />
          <PwaBootstrap />
        </ThemeProvider>
      </body>
    </html>
  )
}
