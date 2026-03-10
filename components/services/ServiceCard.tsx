"use client"

import { Clock3, CheckCircle2 } from "lucide-react"
import type { Service } from "@/types/service"
import { formatMoney } from "@/lib/utils"
import ServiceQuantitySelector from "@/components/services/ServiceQuantitySelector"

type ServiceCardProps = {
  service: Service
  quantity: number
  onQuantityChange: (value: number) => void
}

export default function ServiceCard({ service, quantity, onQuantityChange }: ServiceCardProps) {
  const selected = quantity > 0

  return (
    <article
      className={`rounded-xl border p-5 transition-colors ${selected
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-card text-card-foreground hover:bg-input"
        }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-2">
            {selected && <CheckCircle2 size={18} className="fill-background text-foreground" />}
            <p className={`text-base font-semibold leading-tight ${selected ? "text-background" : "text-foreground"}`}>
              {service.name}
            </p>
          </div>
          <p className={`mt-2 max-w-[520px] text-sm leading-relaxed ${selected ? "text-background opacity-80" : "text-muted-foreground"}`}>
            {service.description}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className={`text-base font-semibold leading-none ${selected ? "text-background" : "text-foreground"}`}>
              {formatMoney(service.priceArs)}
            </span>
            <span className={`flex items-center gap-1.5 text-sm ${selected ? "text-background opacity-70" : "text-muted-foreground"}`}>
              <Clock3 size={14} />
              {service.durationMin} min
            </span>
          </div>
        </div>

        <ServiceQuantitySelector quantity={quantity} onChange={onQuantityChange} />
      </div>
    </article>
  )
}
