"use client"

import { useMemo, useState } from "react"
import { Search, Users, Check, UserX, EyeOff, XCircle } from "lucide-react"
import ClientList from "@/components/clients/ClientList"
import ClientStats from "@/components/clients/ClientStats"
import { Client, useClients } from "@/context/AppointmentContext"
import { useHasMounted } from "@/hooks/useHasMounted"

export default function ClientesPage() {
  const { clients, editClient, deleteClient } = useClients()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Client | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const hasMounted = useHasMounted()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients

    return clients.filter((client) => {
      const nameMatch = client.name.toLowerCase().includes(q)
      const phoneMatch = client.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      return nameMatch || phoneMatch
    })
  }, [clients, query])

  const stats = useMemo(() => {
    const attended = clients.reduce((sum, client) => sum + client.stats.completed, 0)
    const recurrent = clients.filter((client) => client.stats.completed > 1).length

    return {
      total: clients.length,
      attended,
      recurrent,
    }
  }, [clients])

  const openEdit = (client: Client) => {
    setEditing(client)
    setName(client.name)
    setPhone(client.phone)
  }

  const saveEdit = () => {
    if (!editing) return

    editClient({
      clientId: editing.id,
      name,
      phone,
    })

    setEditing(null)
  }

  if (!hasMounted) {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 text-center">
        <p className="text-muted italic animate-pulse">Cargando clientes...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Relacion</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-muted">Busca, edita y ordena tu base de clientes.</p>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <Users size={16} />
        <h2 className="text-lg font-semibold">Clientes</h2>
      </div>

      <div className="mb-4 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full rounded-xl border border-surface bg-surface py-2.5 pl-9 pr-3 text-sm outline-none"
        />
      </div>

      <div className="mb-4">
        <ClientStats total={stats.total} attended={stats.attended} recurrent={stats.recurrent} />
      </div>

      <ClientList
        clients={filtered}
        onEdit={openEdit}
        onDelete={(client) => deleteClient(client.id)}
      />

      <div className="mt-8 flex flex-wrap items-center gap-6 text-[13px] font-medium text-muted/80">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-emerald-500" />
          <span>Completadas</span>
        </div>
        <div className="flex items-center gap-2">
          <UserX size={14} className="text-orange-500" />
          <span>Avisó</span>
        </div>
        <div className="flex items-center gap-2">
          <EyeOff size={14} className="text-rose-400" />
          <span>No-show</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle size={14} className="text-red-500" />
          <span>Canceladas</span>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[16px]">
          <div className="glass-card w-full max-w-[460px] p-5">
            <h3 className="mb-3 text-lg font-semibold">Editar cliente</h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-surface bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Teléfono</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-surface bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="button-secondary h-10 px-5 text-sm">
                Cancelar
              </button>
              <button onClick={saveEdit} className="button-primary h-10 !w-auto !mt-0 px-5 text-sm">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
