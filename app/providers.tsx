"use client"

import { AppointmentProvider } from "@/context/AppointmentContext"
import { DateBlockProvider } from "@/context/DateBlockContext"
import { PromotionProvider } from "@/context/PromotionContext"
import { SettingsProvider } from "@/context/SettingsContext"
import { TimeBlockProvider } from "@/context/TimeBlockContext"
import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <DateBlockProvider>
          <TimeBlockProvider>
            <PromotionProvider>
              <AppointmentProvider>{children}</AppointmentProvider>
            </PromotionProvider>
          </TimeBlockProvider>
        </DateBlockProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
