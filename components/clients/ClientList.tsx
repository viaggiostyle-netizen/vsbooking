import { Check, EyeOff, Pencil, Trash2, UserX, MessageCircle, XCircle } from "lucide-react"
import type { ReactNode } from "react"
import { Client } from "@/context/AppointmentContext"

type ClientListProps = {
  clients: Client[]
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export default function ClientList({ clients, onEdit, onDelete }: ClientListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface bg-surface">
      <div className="hidden md:grid grid-cols-[minmax(240px,1.6fr)_90px_90px_90px_90px_84px] border-b border-surface px-4 py-3 text-sm font-medium text-muted">
        <span>Cliente</span>
        <span className="text-center"><Check size={14} className="mx-auto text-emerald-500" /></span>
        <span className="text-center"><UserX size={14} className="mx-auto text-orange-500" /></span>
        <span className="text-center"><EyeOff size={14} className="mx-auto text-rose-400" /></span>
        <span className="text-center"><XCircle size={14} className="mx-auto text-red-500" /></span>
        <span className="text-right">Acciones</span>
      </div>

      {clients.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted">No hay clientes para mostrar.</div>
      ) : (
        <>
          <div className="hidden md:block">
            {clients.map((client) => {
              const normalizedPhone = normalizePhone(client.phone)
              const wa = normalizedPhone

              return (
                <div key={client.id} className="grid grid-cols-[minmax(240px,1.6fr)_90px_90px_90px_90px_84px] items-center border-b border-surface px-4 py-3 last:border-b-0">
                  <div>
                    <p className="text-base font-semibold">{client.name}</p>
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
                      <MessageCircle size={12} />
                      {normalizedPhone}
                    </a>
                  </div>

                  <Cell value={client.stats.completed} />
                  <Cell value={client.stats.noShowWarned} />
                  <Cell value={client.stats.noShow} />
                  <Cell value={client.stats.cancelled} />

                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(client)} className="rounded-full p-1.5 hover:bg-card">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(client)} className="rounded-full p-1.5 hover:bg-card">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="md:hidden divide-y divide-border">
            {clients.map((client) => {
              const normalizedPhone = normalizePhone(client.phone)
              const wa = normalizedPhone

              return (
                <div key={client.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{client.name}</p>
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
                        <MessageCircle size={12} />
                        {normalizedPhone}
                      </a>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => onEdit(client)} className="rounded-full p-1.5 hover:bg-card">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(client)} className="rounded-full p-1.5 hover:bg-card">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium text-muted">
                    <MobileStat
                      icon={<Check size={14} className="text-emerald-500" />}
                      label="Completadas"
                      value={client.stats.completed}
                    />
                    <MobileStat
                      icon={<UserX size={14} className="text-orange-500" />}
                      label="Avisó"
                      value={client.stats.noShowWarned}
                    />
                    <MobileStat
                      icon={<EyeOff size={14} className="text-rose-400" />}
                      label="No-show"
                      value={client.stats.noShow}
                    />
                    <MobileStat
                      icon={<XCircle size={14} className="text-red-500" />}
                      label="Canceladas"
                      value={client.stats.cancelled}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Cell({ value }: { value: number }) {
  return (
    <div className="text-center">
      <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-surface px-2 py-0.5 text-xs">{value}</span>
    </div>
  )
}

function MobileStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface bg-card px-3 py-2">
      <span className="inline-flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
      <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-surface px-2 py-0.5 text-xs text-foreground">
        {value}
      </span>
    </div>
  )
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""

  let normalized = digits
  while (normalized.startsWith("549549")) {
    normalized = normalized.slice(3)
  }

  return normalized
}
