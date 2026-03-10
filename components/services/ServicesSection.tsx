"use client"

import Link from "next/link"
import { Scissors } from "lucide-react"
import { useMemo } from "react"
import FooterBar from "@/components/FooterBar"
import ServiceCard from "@/components/services/ServiceCard"
import { useServicesStore } from "@/stores/useServicesStore"

export default function ServicesSection() {
  const services = useServicesStore((state) => state.services)
  const selected = useServicesStore((state) => state.selected)
  const setQuantity = useServicesStore((state) => state.setQuantity)

  const summary = useMemo(() => {
    return selected.reduce(
      (acc, item) => {
        const service = services.find((entry) => entry.id === item.serviceId)
        if (!service) return acc

        acc.quantity += item.quantity
        acc.duration += service.durationMin * item.quantity
        acc.price += service.priceArs * item.quantity
        acc.items.push({ service, quantity: item.quantity })
        return acc
      },
      {
        quantity: 0,
        duration: 0,
        price: 0,
        items: [] as Array<{ service: (typeof services)[number]; quantity: number }>,
      }
    )
  }, [selected, services])

  return (
    <section className={summary.quantity > 0 ? "pb-[96px]" : ""}>
      <div className="mt-8 flex items-center gap-2 text-muted">
        <Scissors size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">Nuestros servicios</span>
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {services.map((service) => {
          const quantity = selected.find((item) => item.serviceId === service.id)?.quantity ?? 0
          return (
            <ServiceCard
              key={service.id}
              service={service}
              quantity={quantity}
              onQuantityChange={(value) => setQuantity(service.id, value)}
            />
          )
        })}
      </div>

      {services.length === 0 && (
        <div className="service-card text-[14px] text-muted">
          Aun no hay servicios configurados. Cargalos desde Organizacion.
        </div>
      )}

      <p className="mt-[20px] text-center text-[13px] font-[400] text-muted">
        <Link
          className="inline-block no-underline transition-colors hover:text-foreground hover:underline"
          href="/manage"
        >
          ¿Ya tienes una cita? Haz click aquí para cancelar o modificar
        </Link>
      </p>

      {summary.quantity > 0 && (
        <FooterBar
          label={summary.items.map((item) => `${item.service.name} x${item.quantity}`).join(", ")}
          price={summary.price}
          duration={summary.duration}
          href="/booking"
        />
      )}
    </section>
  )
}
