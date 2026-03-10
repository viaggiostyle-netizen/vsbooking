"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Clock3, Scissors, Settings2, Sparkles, Tag } from "lucide-react"
import { useHasMounted } from "@/hooks/useHasMounted"
import { readOrganizationData, type Service } from "@/lib/admin-organization"

export default function ServiciosPage() {
  const hasMounted = useHasMounted()
  const services = useMemo<Service[]>(
    () => (hasMounted ? readOrganizationData().services : []),
    [hasMounted]
  )

  const activeServices = useMemo(
    () => services.filter((service) => service.active),
    [services]
  )

  const averageDuration = useMemo(() => {
    if (activeServices.length === 0) return 0
    const total = activeServices.reduce((sum, item) => sum + item.durationMin, 0)
    return Math.round(total / activeServices.length)
  }, [activeServices])

  const averagePrice = useMemo(() => {
    if (activeServices.length === 0) return 0
    const total = activeServices.reduce((sum, item) => sum + item.priceArs, 0)
    return Math.round(total / activeServices.length)
  }, [activeServices])

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
          Catalogo
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Servicios</h1>
        <p className="mt-1 text-sm text-muted">
          Controla tu oferta activa y el valor de cada turno.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="admin-panel p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Activos</span>
            <Sparkles size={16} className="text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-bold">{activeServices.length}</p>
        </article>

        <article className="admin-panel p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Precio promedio</span>
            <Tag size={16} className="text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-bold">$ {averagePrice.toLocaleString("es-AR")}</p>
        </article>

        <article className="admin-panel p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Duracion promedio</span>
            <Clock3 size={16} className="text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-bold">{averageDuration} min</p>
        </article>
      </div>

      <section className="admin-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scissors size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Lista de servicios</h2>
          </div>

          <Link href="/admin/configuracion" className="button-secondary inline-flex h-10 items-center px-4">
            <Settings2 size={15} className="mr-2" />
            Gestionar
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="rounded-2xl border border-surface bg-surface/60 px-4 py-10 text-center">
            <p className="text-sm text-muted">
              Aun no hay servicios cargados. Configuralos desde Organizacion.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-2xl border border-surface bg-surface p-4 transition-all duration-300 ease-in-out hover:bg-[var(--hover)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{service.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {service.description || "Sin descripcion"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      service.active
                        ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]"
                        : "bg-muted/20 text-muted"
                    }`}
                  >
                    {service.active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <span className="rounded-lg border border-surface bg-card px-2 py-1">
                    $ {service.priceArs.toLocaleString("es-AR")}
                  </span>
                  <span className="rounded-lg border border-surface bg-card px-2 py-1">
                    {service.durationMin} min
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
