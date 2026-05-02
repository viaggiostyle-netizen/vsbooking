import { Clock3, Tag } from "lucide-react"
import { formatMoney } from "@/lib/utils"
import type { Service } from "@/types/service"
import { usePromotionsStore } from "@/stores/usePromotionsStore"
import { calculateFinalPrice } from "@/lib/pricing"
import { getTodayDateKeyArgentina } from "@/lib/date"
import { useMemo } from "react"

type BookingSummaryProps = {
  services: Array<{ service: Service; quantity: number }>
}

export default function BookingSummary({ services }: BookingSummaryProps) {
  const promotions = usePromotionsStore((state) => state.promotions)
  const today = getTodayDateKeyArgentina()

  const { totalPrice, totalOriginalPrice, totalDuration, label, appliedPromos } = useMemo(() => {
    let price = 0
    let originalPrice = 0
    let duration = 0
    const promos: { name: string; quantity: number }[] = []
    
    services.forEach((item) => {
      duration += item.service.durationMin * item.quantity
      
      const pricing = calculateFinalPrice(
        item.service.priceArs,
        promotions,
        item.service.name,
        today,
        item.quantity
      )

      price += pricing.finalPrice * item.quantity
      originalPrice += item.service.priceArs * item.quantity

      if (pricing.promotionId) {
        const promo = promotions.find(p => p.id === pricing.promotionId)
        if (promo) {
          promos.push({ name: promo.name, quantity: item.quantity })
        }
      }
    })

    return {
      totalPrice: price,
      totalOriginalPrice: originalPrice,
      totalDuration: duration,
      label: services.map((item) => `${item.service.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`).join(", "),
      appliedPromos: promos,
    }
  }, [services, promotions, today])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 pr-3">
            <p className="truncate text-base font-semibold leading-tight text-foreground">{label || "Sin servicio seleccionado"}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Clock3 size={14} />
              {totalDuration || 0} min
            </p>
          </div>
          <div className="text-right">
            {totalPrice < totalOriginalPrice && (
              <p className="text-xs text-muted-foreground line-through mb-1">{formatMoney(totalOriginalPrice)}</p>
            )}
            <p className="text-base font-semibold leading-none text-foreground">{formatMoney(totalPrice)}</p>
          </div>
        </div>
      </div>
      
      {appliedPromos.length > 0 && (
        <div className="bg-emerald-500/10 border-t border-emerald-500/20 p-4">
          {appliedPromos.map((promo, i) => (
            <div key={i} className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
              <Tag size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">
                Se aplicó de manera automática: <strong>{promo.name}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
