import { Clock3, Tag, AlertCircle, Info, CheckCircle2 } from "lucide-react"
import { formatMoney } from "@/lib/utils"
import type { Service } from "@/types/service"
import type { Promotion } from "@/types/promotion"
import { usePromotionsStore } from "@/stores/usePromotionsStore"
import { calculateFinalPrice } from "@/lib/pricing"
import { getTodayDateKeyArgentina } from "@/lib/date"
import { useMemo, useState } from "react"

type BookingSummaryProps = {
  services: Array<{ service: Service; quantity: number }>
  manualActiveIds: string[]
  setManualActiveIds: (ids: string[]) => void
}

export default function BookingSummary({ services, manualActiveIds, setManualActiveIds }: BookingSummaryProps) {
  const promotions = usePromotionsStore((state) => state.promotions)
  const today = getTodayDateKeyArgentina()

  const { totalPrice, totalOriginalPrice, totalDuration, label, appliedPromos, evaluationsList } = useMemo(() => {
    let price = 0
    let originalPrice = 0
    let duration = 0
    const promos: { name: string; mode: string, discountAmount: number }[] = []
    const evaluations = new Map<string, { promotion: Promotion, eligible: boolean, reason?: string }>()
    
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

      pricing.evaluations.forEach(ev => {
         const prev = evaluations.get(ev.promotion.id)
         if (!prev || (!prev.eligible && ev.eligible)) {
             evaluations.set(ev.promotion.id, ev)
         }
      })

      if (pricing.promotionId) {
        const promo = promotions.find(p => p.id === pricing.promotionId)
        if (promo && !promos.find(p => p.name === promo.name)) {
          promos.push({ name: promo.name, mode: promo.applicationMode, discountAmount: pricing.discount })
        }
      }
    })

    return {
      totalPrice: price,
      totalOriginalPrice: originalPrice,
      totalDuration: duration,
      label: services.map((item) => `${item.service.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`).join(", "),
      appliedPromos: promos,
      evaluationsList: Array.from(evaluations.values())
    }
  }, [services, promotions, today, manualActiveIds])

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
      
      {/* Automatic Application Results */}
      {appliedPromos.map((promo, i) => (
        <div key={i} className="bg-emerald-500/10 border-t border-emerald-500/20 p-4">
          <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm font-medium">
              Valor {formatMoney(totalPrice)} por promoción {promo.mode === "automatic" ? "automática" : "manual"} activada: <strong>{promo.name}</strong>
            </p>
          </div>
        </div>
      ))}

      {/* Manual Promotions & Rejections Explanation */}
      {evaluationsList.length > 0 && (
        <div className="bg-muted/5 border-t border-border/40 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Disponibilidad de Ofertas</p>
          
          {evaluationsList.map((ev, i) => {
            const isManualActive = manualActiveIds.includes(ev.promotion.id)
            const isApplied = appliedPromos.some(p => p.name === ev.promotion.name)

            if (ev.eligible) {
              if (ev.promotion.applicationMode === "automatic") return null; // Already shown above
              
              if (isApplied) return null; // Already displayed as activated!

              return (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-start gap-2">
                    <Tag size={16} className="mt-0.5 text-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-semibold">{ev.promotion.name}</p>
                      <p className="text-xs text-muted">Oferta manual elegible para tu reserva.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setManualActiveIds([...manualActiveIds, ev.promotion.id])}
                    className="shrink-0 rounded-full bg-[var(--accent)] text-white px-4 py-1.5 text-xs font-bold hover:bg-[var(--accent-strong)] transition-colors"
                  >
                    Activar Promoción
                  </button>
                </div>
              )
            } else {
              return (
                <div key={i} className="flex items-start gap-2 text-muted-foreground p-2">
                  <Info size={16} className="mt-0.5 shrink-0 opacity-70" />
                  <p className="text-xs leading-relaxed">
                    Tu promoción <strong>{ev.promotion.name}</strong> no se ha podido activar por los siguientes motivos: {ev.reason}
                  </p>
                </div>
              )
            }
          })}
        </div>
      )}
    </div>
  )
}
