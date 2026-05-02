export type PromotionType = "percentage" | "fixed"
export type PromotionMode = "automatic" | "manual"

export type Promotion = {
  id: string
  name: string
  description: string
  type: PromotionType
  value: number
  applicationMode: PromotionMode
  applicableServices: string[]
  startDate: string
  endDate: string
  active: boolean
  createdAt: string
  requiredQuantity?: number
}

export type PromotionInput = Omit<Promotion, "id" | "createdAt">

export function createPromotion(promotions: Promotion[], input: PromotionInput): Promotion[] {
  const promotion: Promotion = {
    ...input,
    id: createId(),
    createdAt: new Date().toISOString(),
  }
  return [...promotions, promotion]
}

export function updatePromotion(
  promotions: Promotion[],
  id: string,
  patch: Partial<PromotionInput>
): Promotion[] {
  return promotions.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

export function deletePromotion(promotions: Promotion[], id: string): Promotion[] {
  return promotions.filter((item) => item.id !== id)
}

export function getActivePromotions(promotions: Promotion[], date: string): Promotion[] {
  return promotions.filter((promotion) => {
    if (!promotion.active) return false
    return date >= promotion.startDate && date <= promotion.endDate
  })
}

export function getApplicablePromotions(
  promotions: Promotion[],
  service: string,
  date: string,
  mode?: PromotionMode
): Promotion[] {
  return getActivePromotions(promotions, date).filter((promotion) => {
    if (mode && promotion.applicationMode !== mode) return false
    if (promotion.applicableServices.length === 0) return true
    return promotion.applicableServices.includes(service)
  })
}

export function calculateFinalPrice(price: number, promotion: Promotion): number {
  let finalPrice = price

  if (promotion.type === "percentage") {
    finalPrice = price - (price * promotion.value) / 100
  }

  if (promotion.type === "fixed") {
    finalPrice = price - promotion.value
  }

  return Math.max(0, Math.round(finalPrice))
}

export function applyBestPromotion(
  promotions: Promotion[],
  price: number,
  service: string,
  date: string
): { promotionId: string | null; finalPrice: number } {
  const automatic = getApplicablePromotions(promotions, service, date, "automatic")

  if (automatic.length === 0) {
    return {
      promotionId: null,
      finalPrice: price,
    }
  }

  let best = automatic[0]
  let bestPrice = calculateFinalPrice(price, best)

  automatic.slice(1).forEach((promotion) => {
    const finalPrice = calculateFinalPrice(price, promotion)
    if (finalPrice < bestPrice) {
      best = promotion
      bestPrice = finalPrice
    }
  })

  return {
    promotionId: best.id,
    finalPrice: bestPrice,
  }
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
