import type { Promotion } from "@/types/promotion"

export type PromotionEvaluation = {
  promotion: Promotion
  eligible: boolean
  reason?: string
}

export type PriceResult = {
  promotionId: string | null
  originalPrice: number
  discount: number
  finalPrice: number
  evaluations: PromotionEvaluation[]
}

export function evaluatePromotion(
  promotion: Promotion,
  serviceName: string,
  date: string,
  serviceQuantity: number
): { eligible: boolean; reason?: string } {
  if (!promotion.active) return { eligible: false, reason: "La promoción está inactiva." }
  if (date < promotion.startDate || date > promotion.endDate) {
    return { eligible: false, reason: "La promoción no está vigente para esta fecha." }
  }
  if (promotion.applicableServices.length > 0 && !promotion.applicableServices.includes(serviceName)) {
    return { eligible: false, reason: "No aplica para este servicio." }
  }
  if (promotion.requiredQuantity && serviceQuantity < promotion.requiredQuantity) {
    return { eligible: false, reason: `Requiere al menos ${promotion.requiredQuantity} servicio(s), seleccionaste ${serviceQuantity}.` }
  }
  return { eligible: true }
}

export function calculateFinalPrice(
  originalPrice: number,
  promotions: Promotion[],
  serviceName: string,
  date: string,
  serviceQuantity: number = 1,
  manualActiveIds: string[] = []
): PriceResult {
  const evaluations: PromotionEvaluation[] = promotions.map((promotion) => ({
    promotion,
    ...evaluatePromotion(promotion, serviceName, date, serviceQuantity)
  }))

  const applicable = evaluations
    .filter((evalResult) => evalResult.eligible)
    .map((evalResult) => evalResult.promotion)
    .filter((promotion) => {
      // Si es manual, debe estar en la lista de los activados manualmente.
      return promotion.applicationMode === "automatic" || manualActiveIds.includes(promotion.id)
    })

  if (applicable.length === 0) {
    return {
      promotionId: null,
      originalPrice,
      discount: 0,
      finalPrice: originalPrice,
      evaluations,
    }
  }

  let best = applicable[0]
  let bestFinalPrice = getDiscountedPrice(originalPrice, best)

  applicable.slice(1).forEach((promotion) => {
    const finalPrice = getDiscountedPrice(originalPrice, promotion)
    if (finalPrice < bestFinalPrice) {
      best = promotion
      bestFinalPrice = finalPrice
    }
  })

  return {
    promotionId: best.id,
    originalPrice,
    discount: Math.max(0, originalPrice - bestFinalPrice),
    finalPrice: bestFinalPrice,
    evaluations,
  }
}

export function getDiscountedPrice(price: number, promotion: Promotion) {
  const discounted =
    promotion.type === "percentage"
      ? price - (price * promotion.value) / 100
      : price - promotion.value

  return Math.max(0, Math.round(discounted))
}
