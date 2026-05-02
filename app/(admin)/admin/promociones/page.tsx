"use client"

import { useMemo, useState } from "react"
import { Plus, Tag, Pencil, Trash2, Percent } from "lucide-react"
import { readOrganizationData } from "@/lib/admin-organization"
import { Promotion, PromotionInput } from "@/lib/promotionUtils"
import { usePromotions } from "@/context/PromotionContext"
import PromotionModal from "@/components/admin/PromotionModal"
import { useHasMounted } from "@/hooks/useHasMounted"

export default function PromocionesPage() {
  const { promotions, createPromotion, updatePromotion, deletePromotion, togglePromotionActive } = usePromotions()
  const services = useMemo(() => readOrganizationData().services.map((service) => service.name), [])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [modalVersion, setModalVersion] = useState(0)
  const hasMounted = useHasMounted()

  const sortedPromotions = useMemo(
    () => [...promotions].sort((a, b) => Number(b.active) - Number(a.active)),
    [promotions]
  )

  const openCreate = () => {
    setEditing(null)
    setModalVersion((value) => value + 1)
    setOpen(true)
  }

  const openEdit = (promotion: Promotion) => {
    setEditing(promotion)
    setModalVersion((value) => value + 1)
    setOpen(true)
  }

  const handleSave = (payload: PromotionInput) => {
    if (editing) updatePromotion(editing.id, payload)
    else createPromotion(payload)
  }

  if (!hasMounted) {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 text-center">
        <p className="text-muted italic animate-pulse">Cargando promociones...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Ventas</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Promociones</h1>
        <p className="mt-1 text-sm text-muted">
          Crea ofertas activas para aumentar conversion y recompra.
        </p>
      </header>

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Tag size={18} className="text-foreground/80" />
            <h2 className="text-xl font-bold tracking-tight">Promociones</h2>
          </div>
          <p className="text-[13px] text-muted font-medium">Crea ofertas y descuentos para tus clientes</p>
        </div>

        <button
          onClick={openCreate}
          className="button-primary !mt-0 inline-flex h-11 !w-auto items-center gap-2 px-5 text-[13px] font-bold"
        >
          <Plus size={16} />
          Nueva promocion
        </button>
      </div>

      {sortedPromotions.length === 0 ? (
        <section className="rounded-2xl border border-border/40 bg-card/30 p-12 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-muted/20">
            <Tag size={32} className="text-muted" />
          </div>
          <h3 className="text-lg font-bold">Sin promociones</h3>
          <p className="mt-2 text-sm text-muted">Aún no has creado ninguna oferta para tus servicios.</p>
          <button
            onClick={openCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-[13px] font-bold hover:bg-card transition-colors"
          >
            <Plus size={14} />
            Crear mi primera promoción
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sortedPromotions.map((promotion) => (
            <article key={promotion.id} className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-5 transition-all hover:bg-card hover:shadow-lg hover:shadow-black/5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold truncate">{promotion.name}</h3>
                    {!promotion.active && (
                      <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-bold text-muted uppercase tracking-wider">Inactiva</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted font-medium line-clamp-2 leading-relaxed">
                    {promotion.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="accent" icon={<Percent size={11} />} label={`${promotion.type === "percentage" ? promotion.value + "%" : "$ " + promotion.value}`} />
                    <Badge tone="accent" label={promotion.applicationMode === "automatic" ? "Auto" : "Manual"} />
                    <Badge label={`${formatDate(promotion.startDate)} - ${formatDate(promotion.endDate)}`} />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    onClick={() => togglePromotionActive(promotion.id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${promotion.active
                      ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
                      : "bg-muted/20 text-muted ring-1 ring-muted/30"
                      }`}
                  >
                    {promotion.active ? "En curso" : "Pausada"}
                  </button>
                  <div className="flex justify-end gap-1 mt-1 opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100">
                    <button onClick={() => openEdit(promotion)} className="rounded-full p-2 bg-card/50 hover:bg-card ring-1 ring-border/20 shadow-sm"><Pencil size={14} /></button>
                    <button onClick={() => {
                      if (window.confirm("¿Seguro que deseas eliminar esta promoción?")) {
                        deletePromotion(promotion.id)
                      }
                    }} className="rounded-full p-2 bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/20 shadow-sm"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <PromotionModal
        key={modalVersion}
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        editingPromotion={editing}
        services={services}
      />
    </section>
  )
}

function Badge({ label, icon, tone = "default" }: { label: string; icon?: React.ReactNode; tone?: "default" | "accent" }) {
  const toneClass =
    tone === "accent"
      ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
      : "bg-muted/20 text-muted/80 ring-border/10"

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${toneClass}`}>
      {icon}
      {label}
    </span>
  )
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}`
}
