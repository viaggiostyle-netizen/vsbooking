"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  Promotion,
  PromotionInput,
  createPromotion as createPromotionUtil,
  deletePromotion as deletePromotionUtil,
  updatePromotion as updatePromotionUtil,
} from "@/lib/promotionUtils"

type PromotionContextValue = {
  promotions: Promotion[]
  createPromotion: (input: PromotionInput) => void
  updatePromotion: (id: string, patch: Partial<PromotionInput>) => void
  deletePromotion: (id: string) => void
  togglePromotionActive: (id: string) => void
}

const STORAGE_KEY = "barber-promotions-v1"
const PromotionContext = createContext<PromotionContextValue | undefined>(undefined)

export function PromotionProvider({ children }: { children: React.ReactNode }) {
  const [promotions, setPromotions] = useState<Promotion[]>([])

  useEffect(() => {
    setPromotions(readPromotions())
  }, [])

  useEffect(() => {
    if (promotions.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions))
    }
  }, [promotions])

  const value = useMemo<PromotionContextValue>(() => {
    return {
      promotions,
      createPromotion: (input) => {
        setPromotions((prev) => createPromotionUtil(prev, input))
      },
      updatePromotion: (id, patch) => {
        setPromotions((prev) => updatePromotionUtil(prev, id, patch))
      },
      deletePromotion: (id) => {
        setPromotions((prev) => deletePromotionUtil(prev, id))
      },
      togglePromotionActive: (id) => {
        setPromotions((prev) => prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item)))
      },
    }
  }, [promotions])

  return <PromotionContext.Provider value={value}>{children}</PromotionContext.Provider>
}

export function usePromotions() {
  const context = useContext(PromotionContext)
  if (!context) throw new Error("usePromotions must be used inside PromotionProvider")
  return context
}

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

  if (typeof item.id !== "string") return false
  if (typeof item.name !== "string") return false
  if (typeof item.description !== "string") return false
  if (item.type !== "percentage" && item.type !== "fixed") return false
  if (typeof item.value !== "number") return false
  if (item.applicationMode !== "automatic" && item.applicationMode !== "manual") return false
  if (!Array.isArray(item.applicableServices)) return false
  if (typeof item.startDate !== "string") return false
  if (typeof item.endDate !== "string") return false
  if (typeof item.active !== "boolean") return false
  if (typeof item.createdAt !== "string") return false
  if (item.requiredQuantity !== undefined && typeof item.requiredQuantity !== "number") return false

  return true
}
