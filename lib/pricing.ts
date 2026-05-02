import type { Promotion } from "@/types/promotion"

type PriceResult = {
  promotionId: string | null
  originalPrice: number
  discount: number
  finalPrice: number
}

export function calculateFinalPrice(
  originalPrice: number,
  promotions: Promotion[],
  serviceName: string,
  date: string,
  serviceQuantity: number = 1
): PriceResult {
  const applicable = promotions.filter((promotion) => {
    if (!promotion.active) return false
    if (promotion.applicationMode !== "automatic") return false
    if (date < promotion.startDate || date > promotion.endDate) return false
    if (promotion.requiredQuantity && serviceQuantity < promotion.requiredQuantity) return false
    if (promotion.applicableServices.length === 0) return true
    return promotion.applicableServices.includes(serviceName)
  })

  if (applicable.length === 0) {
    return {
      promotionId: null,
      originalPrice,
      discount: 0,
      finalPrice: originalPrice,
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
  }
}

function getDiscountedPrice(price: number, promotion: Promotion) {
  const discounted =
    promotion.type === "percentage"
      ? price - (price * promotion.value) / 100
      : price - promotion.value

  return Math.max(0, Math.round(discounted))
}
