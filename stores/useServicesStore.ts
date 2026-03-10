"use client"

import { create } from "zustand"
import type { SelectedService, Service } from "@/types/service"
import { readOrganizationData } from "@/lib/admin-organization"

type ServicesState = {
  services: Service[]
  selected: SelectedService[]
  hydrateServices: () => void
  setQuantity: (serviceId: string, quantity: number) => void
  clearSelection: () => void
}

export const useServicesStore = create<ServicesState>((set) => ({
  services: [],
  selected: [],
  hydrateServices: () => {
    const services = readServicesFromAdmin()
    set((state) => ({
      services,
      selected: state.selected.filter((item) => services.some((service) => service.id === item.serviceId)),
    }))
  },
  setQuantity: (serviceId, quantity) =>
    set((state) => {
      const next = state.selected.filter((item) => item.serviceId !== serviceId)

      if (quantity > 0) next.push({ serviceId, quantity })
      return { selected: next }
    }),
  clearSelection: () => set({ selected: [] }),
}))

function readServicesFromAdmin(): Service[] {
  return readOrganizationData().services
    .filter((service) => service.active)
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      priceArs: service.priceArs,
      durationMin: service.durationMin,
      active: service.active,
    }))
}
