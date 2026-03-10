import { Clock3 } from "lucide-react"
import { formatMoney } from "@/lib/utils"
import type { Service } from "@/types/service"

type BookingSummaryProps = {
  services: Array<{ service: Service; quantity: number }>
}

export default function BookingSummary({ services }: BookingSummaryProps) {
  const totalPrice = services.reduce((sum, item) => sum + item.service.priceArs * item.quantity, 0)
  const totalDuration = services.reduce((sum, item) => sum + item.service.durationMin * item.quantity, 0)
  const label = services.map((item) => `${item.service.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`).join(", ")

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-card-foreground">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 pr-3">
          <p className="truncate text-base font-semibold leading-tight text-foreground">{label || "Sin servicio seleccionado"}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <Clock3 size={14} />
            {totalDuration || 0} min
          </p>
        </div>
        <p className="text-base font-semibold leading-none text-foreground">{formatMoney(totalPrice)}</p>
      </div>
    </div>
  )
}
