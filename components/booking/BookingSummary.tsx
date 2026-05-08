import { CheckCircle2, Clock3, Info, Tag } from "lucide-react"
import { useEffect, useMemo } from "react"
import { getTodayDateKeyArgentina } from "@/lib/date"
import { calculateFinalPrice } from "@/lib/pricing"
import { formatMoney } from "@/lib/utils"
import { usePromotionsStore } from "@/stores/usePromotionsStore"
import type { Service } from "@/types/service"
import type { Promotion } from "@/types/promotion"

type BookingSummaryProps = {
  services: Array<{ service: Service; quantity: number }>
  manualActiveIds: string[]
  setManualActiveIds: (ids: string[]) => void
}

type PromotionSummary = {
  promotion: Promotion
  discountAmount: number
}

type PromotionEvaluationSummary = {
  promotion: Promotion
  eligible: boolean
  reason?: string
}

export default function BookingSummary({
  services,
  manualActiveIds,
  setManualActiveIds,
}: BookingSummaryProps) {
  const promotions = usePromotionsStore((state) => state.promotions)
  const today = getTodayDateKeyArgentina()

  const {
    totalPrice,
    totalOriginalPrice,
    totalDuration,
    label,
    appliedPromos,
    evaluationsList,
    eligibleManualPromotionIds,
  } = useMemo(() => {
    let price = 0
    let originalPrice = 0
    let duration = 0
    const promos = new Map<string, PromotionSummary>()
    const evaluations = new Map<string, PromotionEvaluationSummary>()

    services.forEach((item) => {
      duration += item.service.durationMin * item.quantity

      const pricing = calculateFinalPrice(
        item.service.priceArs,
        promotions,
        item.service.name,
        today,
        item.quantity,
        manualActiveIds
      )

      price += pricing.finalPrice * item.quantity
      originalPrice += item.service.priceArs * item.quantity

      pricing.evaluations.forEach((evaluation) => {
        const previous = evaluations.get(evaluation.promotion.id)
        if (!previous || (!previous.eligible && evaluation.eligible)) {
          evaluations.set(evaluation.promotion.id, evaluation)
        }
      })

      if (pricing.promotionId) {
        const promotion = promotions.find((itemPromotion) => itemPromotion.id === pricing.promotionId)
        if (promotion) {
          const previousDiscount = promos.get(promotion.id)?.discountAmount ?? 0
          promos.set(promotion.id, {
            promotion,
            discountAmount: previousDiscount + pricing.discount * item.quantity,
          })
        }
      }
    })

    const evaluationsList = Array.from(evaluations.values())
    const eligibleManualPromotionIds = evaluationsList
      .filter(
        (evaluation) =>
          evaluation.eligible && evaluation.promotion.applicationMode === "manual"
      )
      .map((evaluation) => evaluation.promotion.id)

    return {
      totalPrice: price,
      totalOriginalPrice: originalPrice,
      totalDuration: duration,
      label: services
        .map((item) => `${item.service.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`)
        .join(", "),
      appliedPromos: Array.from(promos.values()),
      evaluationsList,
      eligibleManualPromotionIds,
    }
  }, [services, promotions, today, manualActiveIds])

  useEffect(() => {
    const nextManualIds = manualActiveIds.filter((id) =>
      eligibleManualPromotionIds.includes(id)
    )

    if (nextManualIds.length !== manualActiveIds.length) {
      setManualActiveIds(nextManualIds)
    }
  }, [eligibleManualPromotionIds, manualActiveIds, setManualActiveIds])

  const toggleManualPromotion = (promotionId: string) => {
    if (manualActiveIds.includes(promotionId)) {
      setManualActiveIds(manualActiveIds.filter((id) => id !== promotionId))
      return
    }

    setManualActiveIds([...manualActiveIds, promotionId])
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 pr-3">
            <p className="truncate text-base font-semibold leading-tight text-foreground">
              {label || "Sin servicio seleccionado"}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Clock3 size={14} />
              {totalDuration || 0} min
            </p>
          </div>
          <div className="text-right">
            {totalPrice < totalOriginalPrice && (
              <p className="mb-1 text-xs text-muted-foreground line-through">
                {formatMoney(totalOriginalPrice)}
              </p>
            )}
            <p className="text-base font-semibold leading-none text-foreground">
              {formatMoney(totalPrice)}
            </p>
          </div>
        </div>
      </div>

      {appliedPromos.map(({ promotion, discountAmount }) => (
        <div
          key={promotion.id}
          className="border-t border-emerald-500/20 bg-emerald-500/10 p-4"
        >
          <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm font-medium">
              Se aplico la promocion{" "}
              {promotion.applicationMode === "automatic" ? "automatica" : "manual"}{" "}
              <strong>{promotion.name}</strong>. Ahorras {formatMoney(discountAmount)}.
            </p>
          </div>
        </div>
      ))}

      {evaluationsList.length > 0 && (
        <div className="space-y-3 border-t border-border/40 bg-muted/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Disponibilidad de ofertas
          </p>

          {evaluationsList.map((evaluation, index) => {
            const isManualActive = manualActiveIds.includes(evaluation.promotion.id)

            if (evaluation.eligible) {
              if (evaluation.promotion.applicationMode === "automatic") return null

              return (
                <div
                  key={index}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-border/50 bg-card/50 p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-2">
                    <Tag size={16} className="mt-0.5 text-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-semibold">{evaluation.promotion.name}</p>
                      <p className="text-xs text-muted">
                        {isManualActive
                          ? "Oferta manual activada para tu reserva."
                          : "Oferta manual elegible para tu reserva."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleManualPromotion(evaluation.promotion.id)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                      isManualActive
                        ? "bg-foreground text-background hover:opacity-85"
                        : "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
                    }`}
                  >
                    {isManualActive ? "Quitar promocion" : "Activar promocion"}
                  </button>
                </div>
              )
            }

            return (
              <div
                key={index}
                className="flex items-start gap-2 p-2 text-muted-foreground"
              >
                <Info size={16} className="mt-0.5 shrink-0 opacity-70" />
                <p className="text-xs leading-relaxed">
                  Tu promocion <strong>{evaluation.promotion.name}</strong> no se pudo activar
                  por los siguientes motivos: {evaluation.reason}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
