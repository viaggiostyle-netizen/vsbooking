"use client"

import { create } from "zustand"
import type { Promotion } from "@/types/promotion"

type PromotionsState = {
  promotions: Promotion[]
  hydratePromotions: () => void
}

const STORAGE_KEY = "barber-promotions-v1"

export const usePromotionsStore = create<PromotionsState>((set) => ({
  promotions: [],
  hydratePromotions: () => set({ promotions: readPromotions() }),
}))

function readPromotions(): Promotion[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPromotion)
  } catch {
    return []
  }
}

function isPromotion(value: unknown): value is Promotion {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<Promotion>

  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.description === "string" &&
    (item.type === "percentage" || item.type === "fixed") &&
    typeof item.value === "number" &&
    (item.applicationMode === "automatic" || item.applicationMode === "manual") &&
    Array.isArray(item.applicableServices) &&
    typeof item.startDate === "string" &&
    typeof item.endDate === "string" &&
    typeof item.active === "boolean" &&
    typeof item.createdAt === "string"
  )
}
