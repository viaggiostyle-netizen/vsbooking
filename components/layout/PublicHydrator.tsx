"use client"

import { useEffect } from "react"
import { useAppointmentsStore } from "@/stores/useAppointmentsStore"
import { useOrganizationStore } from "@/stores/useOrganizationStore"
import { usePromotionsStore } from "@/stores/usePromotionsStore"
import { useServicesStore } from "@/stores/useServicesStore"
import { syncOrganizationFromSupabase } from "@/lib/admin-organization"

export default function PublicHydrator() {
  const hydrateServices = useServicesStore((state) => state.hydrateServices)
  const hydratePromotions = usePromotionsStore((state) => state.hydratePromotions)
  const hydrateOrganization = useOrganizationStore((state) => state.hydrateOrganization)
  const hydrateAppointments = useAppointmentsStore((state) => state.hydrateAppointments)

  useEffect(() => {
    void (async () => {
      await syncOrganizationFromSupabase()
      hydrateServices()
      hydratePromotions()
      hydrateOrganization()
      hydrateAppointments()
    })()
  }, [hydrateServices, hydratePromotions, hydrateOrganization, hydrateAppointments])

  return null
}
