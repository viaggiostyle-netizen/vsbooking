"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Clock3,
  Pencil,
  Plus,
  RotateCcw,
  Scissors,
  Settings,
  Trash2,
  X,
} from "lucide-react"
import {
  BASE_TIME_SLOTS,
  DAY_OPTIONS,
  DayKey,
  OrganizationData,
  ScheduleBlock,
  Service,
  buildEmptyOrganizationData,
  createId,
  readOrganizationData,
  saveOrganizationData,
  syncOrganizationFromSupabase,
} from "@/lib/admin-organization"

type ServiceForm = {
  id: string | null
  name: string
  description: string
  priceArs: string
  durationMin: string
  active: boolean
}

type ScheduleEditorState = {
  dayKey: DayKey
  dayLabel: string
  active: boolean
  blocks: ScheduleBlock[]
}

export default function OrganizacionPage() {
  const [data, setData] = useState<OrganizationData>(() => readOrganizationData())

  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm())
  const [serviceError, setServiceError] = useState("")

  const [scheduleModal, setScheduleModal] = useState<ScheduleEditorState | null>(null)
  const [scheduleError, setScheduleError] = useState("")

  useEffect(() => {
    let active = true
    void syncOrganizationFromSupabase().then((remote) => {
      if (!active || !remote) return
      setData(remote)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    saveOrganizationData(data)
  }, [data])

  const sortedServices = useMemo(
    () => [...data.services].sort((a, b) => Number(b.active) - Number(a.active)),
    [data.services]
  )

  const openCreateService = () => {
    setServiceForm(emptyServiceForm())
    setServiceError("")
    setServiceModalOpen(true)
  }

  const openEditService = (service: Service) => {
    setServiceForm({
      id: service.id,
      name: service.name,
      description: service.description,
      priceArs: String(service.priceArs || ""),
      durationMin: String(service.durationMin || ""),
      active: service.active,
    })
    setServiceError("")
    setServiceModalOpen(true)
  }

  const saveService = () => {
    const name = serviceForm.name.trim()
    const description = serviceForm.description.trim()
    const priceArs = Number(serviceForm.priceArs)
    const durationMin = Number(serviceForm.durationMin)

    if (!name) {
      setServiceError("Ingresa el nombre del servicio")
      return
    }

    if (!Number.isFinite(priceArs) || priceArs < 0) {
      setServiceError("Ingresa un precio valido")
      return
    }

    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      setServiceError("Ingresa una duracion valida")
      return
    }

    setData((prev) => {
      const nextService: Service = {
        id: serviceForm.id ?? createId(),
        name,
        description,
        priceArs,
        durationMin,
        active: serviceForm.active,
      }

      if (!serviceForm.id) {
        return { ...prev, services: [...prev.services, nextService] }
      }

      return {
        ...prev,
        services: prev.services.map((service) =>
          service.id === serviceForm.id ? nextService : service
        ),
      }
    })

    setServiceModalOpen(false)
  }

  const deleteService = (id: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.filter((service) => service.id !== id),
    }))
  }

  const toggleServiceActive = (id: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === id ? { ...service, active: !service.active } : service
      ),
    }))
  }

  const openScheduleEditor = (dayKey: DayKey, dayLabel: string) => {
    const schedule = data.schedules[dayKey]

    setScheduleModal({
      dayKey,
      dayLabel,
      active: schedule.active,
      blocks: schedule.blocks.map((block) => ({ ...block })),
    })
    setScheduleError("")
  }

  const addBlock = () => {
    if (!scheduleModal) return

    setScheduleModal({
      ...scheduleModal,
      blocks: [
        ...scheduleModal.blocks,
        { id: createId(), start: "09:00", end: "14:00" },
      ],
    })
  }

  const removeBlock = (id: string) => {
    if (!scheduleModal) return

    setScheduleModal({
      ...scheduleModal,
      blocks: scheduleModal.blocks.filter((block) => block.id !== id),
    })
  }

  const updateBlock = (id: string, field: "start" | "end", value: string) => {
    if (!scheduleModal) return

    setScheduleModal({
      ...scheduleModal,
      blocks: scheduleModal.blocks.map((block) =>
        block.id === id ? { ...block, [field]: value } : block
      ),
    })
  }

  const saveSchedule = () => {
    if (!scheduleModal) return

    const blocks = [...scheduleModal.blocks].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    )

    for (const block of blocks) {
      if (timeToMinutes(block.start) >= timeToMinutes(block.end)) {
        setScheduleError("Cada bloque debe tener hora de inicio menor a hora de fin")
        return
      }
    }

    for (let index = 1; index < blocks.length; index += 1) {
      const prev = blocks[index - 1]
      const current = blocks[index]
      if (timeToMinutes(current.start) <= timeToMinutes(prev.end)) {
        setScheduleError("Los bloques horarios no pueden superponerse")
        return
      }
    }

    setData((prev) => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [scheduleModal.dayKey]: {
          active: scheduleModal.active,
          blocks,
        },
      },
    }))

    setScheduleModal(null)
  }

  const restoreSchedules = () => {
    setData((prev) => ({
      ...prev,
      schedules: buildEmptyOrganizationData().schedules,
    }))
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Organizacion</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight">Configuracion general</h1>
        <p className="mt-1 text-sm text-muted">Administra servicios y horarios de trabajo.</p>
      </header>

      <div className="mb-8">
        <div className="mb-5 flex items-center gap-2 text-foreground">
          <Settings size={16} />
          <h2 className="text-lg font-semibold">Organización</h2>
        </div>
        <p className="text-sm text-muted">
          Configura los servicios que ofreces y tus horarios de trabajo.
        </p>
      </div>

      <section className="mb-8 rounded-xl border border-surface bg-surface p-4">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scissors size={16} />
            <h3 className="text-lg font-semibold">Gestión de Servicios</h3>
          </div>

          <button
            onClick={openCreateService}
            className="flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:bg-[var(--accent-strong)]"
          >
            <Plus size={16} />
            Nuevo Servicio
          </button>
        </div>

        <div className="space-y-3">
          {sortedServices.length === 0 ? (
            <div className="rounded-2xl border border-surface px-4 py-6 text-sm text-muted">
              No hay servicios creados. Usa el boton Nuevo Servicio para empezar.
            </div>
          ) : (
            sortedServices.map((service) => (
              <article key={service.id} className="rounded-xl border border-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-base font-semibold leading-none">{service.name}</p>
                      <span className="theme-price-chip rounded-md border border-surface px-2 py-0.5 text-sm font-medium">
                        $ {service.priceArs.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm text-muted">
                      {service.description || "Sin descripción"}
                    </p>
                    <p className="mt-1 text-xs text-muted">Duración: {service.durationMin} min</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleServiceActive(service.id)}
                      className={`relative h-7 w-12 rounded-full transition ${
                        service.active ? "bg-[#22c55e]" : "bg-[#9ca3af]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full transition ${
                          service.active ? "right-1 bg-card" : "left-1 bg-card"
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => openEditService(service)}
                      className="text-foreground/90 transition hover:text-foreground"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => deleteService(service.id)}
                      className="text-red-500 transition hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-surface bg-surface p-4">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock3 size={16} />
            <h3 className="text-lg font-semibold">Horarios de Trabajo</h3>
          </div>

          <button
            onClick={restoreSchedules}
            className="flex items-center gap-2 rounded-full border border-surface px-4 py-2 text-base font-semibold text-foreground transition hover:bg-card"
          >
            <RotateCcw size={15} />
            Restaurar
          </button>
        </div>

        <div className="space-y-3">
          {DAY_OPTIONS.map((day) => {
            const schedule = data.schedules[day.key]

            return (
              <article
                key={day.key}
                className="flex items-center justify-between rounded-xl border border-surface p-4"
              >
                <div>
                  <p className="text-base font-semibold leading-none">{day.label}</p>
                  <p className="mt-1 text-xs text-muted">
                    {schedule.active && schedule.blocks.length > 0
                      ? schedule.blocks.map((block) => `${block.start}-${block.end}`).join(" | ")
                      : "Sin horario configurado"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        schedules: {
                          ...prev.schedules,
                          [day.key]: {
                            ...prev.schedules[day.key],
                            active: !prev.schedules[day.key].active,
                          },
                        },
                      }))
                    }
                    className={`relative h-7 w-12 rounded-full transition ${
                      schedule.active ? "bg-[#22c55e]" : "bg-[#9ca3af]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full transition ${
                        schedule.active ? "right-1 bg-card" : "left-1 bg-card"
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => openScheduleEditor(day.key, day.label)}
                    className="rounded-full border border-surface px-4 py-1.5 text-sm font-semibold text-foreground transition hover:bg-card"
                  >
                    Editar horario
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 px-4">
          <div className="w-full max-w-[520px] rounded-xl border border-surface bg-background p-4">
            <div className="mb-5 flex items-center justify-between">
              <h4 className="text-lg font-semibold">
                {serviceForm.id ? "Editar Servicio" : "Nuevo Servicio"}
              </h4>
              <button
                onClick={() => setServiceModalOpen(false)}
                className="text-muted transition hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <FieldLabel text="Nombre del servicio" />
              <input
                value={serviceForm.name}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-2xl border border-surface bg-transparent px-4 py-3 text-base outline-none"
              />

              <FieldLabel text="Descripción" />
              <textarea
                rows={3}
                value={serviceForm.description}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full resize-none rounded-2xl border border-surface bg-transparent px-4 py-3 text-base outline-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel text="Precio (ARS)" />
                  <input
                    value={serviceForm.priceArs}
                    onChange={(event) =>
                      setServiceForm((prev) => ({ ...prev, priceArs: event.target.value }))
                    }
                    className="mt-1 w-full rounded-2xl border border-surface bg-transparent px-4 py-3 text-base outline-none"
                  />
                </div>

                <div>
                  <FieldLabel text="Duración (min)" />
                  <input
                    value={serviceForm.durationMin}
                    onChange={(event) =>
                      setServiceForm((prev) => ({ ...prev, durationMin: event.target.value }))
                    }
                    className="mt-1 w-full rounded-2xl border border-surface bg-transparent px-4 py-3 text-base outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <FieldLabel text="Servicio activo" />
                <button
                  onClick={() =>
                    setServiceForm((prev) => ({
                      ...prev,
                      active: !prev.active,
                    }))
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    serviceForm.active ? "bg-[#22c55e]" : "bg-[#9ca3af]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full transition ${
                      serviceForm.active ? "right-1 bg-card" : "left-1 bg-card"
                    }`}
                  />
                </button>
              </div>

              {serviceError && <p className="text-sm text-red-500">{serviceError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setServiceModalOpen(false)}
                  className="rounded-full border border-surface px-6 py-2 text-base font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveService}
                  className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-6 py-2 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:bg-[var(--accent-strong)]"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 px-4">
          <div className="w-full max-w-[540px] rounded-xl border border-surface bg-background p-4">
            <div className="mb-5 flex items-center justify-between">
              <h4 className="text-lg font-semibold">Editar Horario - {scheduleModal.dayLabel}</h4>
              <button
                onClick={() => setScheduleModal(null)}
                className="text-muted transition hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-base text-muted">
              Configura bloques horarios para este día. Puedes agregar pausas creando bloques
              separados.
            </p>

            <div className="mb-4 flex items-center justify-between rounded-2xl border border-surface px-4 py-3">
              <FieldLabel text="Dia activo" />
              <button
                onClick={() =>
                  setScheduleModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          active: !prev.active,
                        }
                      : prev
                  )
                }
                className={`relative h-7 w-12 rounded-full transition ${
                  scheduleModal.active ? "bg-[#22c55e]" : "bg-[#9ca3af]"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full transition ${
                    scheduleModal.active ? "right-1 bg-card" : "left-1 bg-card"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              {scheduleModal.blocks.map((block) => (
                <div
                  key={block.id}
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-2xl border border-surface p-3"
                >
                  <div>
                    <FieldLabel text="Inicio" />
                    <select
                      value={block.start}
                      onChange={(event) => updateBlock(block.id, "start", event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-surface bg-transparent px-3 py-2.5 text-base outline-none"
                    >
                      {BASE_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel text="Fin" />
                    <select
                      value={block.end}
                      onChange={(event) => updateBlock(block.id, "end", event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-surface bg-transparent px-3 py-2.5 text-base outline-none"
                    >
                      {BASE_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => removeBlock(block.id)}
                    className="mb-2 text-red-500 transition hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addBlock}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-surface px-4 py-2.5 text-base font-semibold transition hover:bg-card"
            >
              <Plus size={16} />
              Agregar Bloque Horario
            </button>

            {scheduleError && <p className="mt-3 text-sm text-red-500">{scheduleError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setScheduleModal(null)}
                className="rounded-full border border-surface px-6 py-2 text-base font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={saveSchedule}
                className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-6 py-2 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:bg-[var(--accent-strong)]"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function emptyServiceForm(): ServiceForm {
  return {
    id: null,
    name: "",
    description: "",
    priceArs: "",
    durationMin: "",
    active: true,
  }
}

type FieldLabelProps = {
  text: string
}

function FieldLabel({ text }: FieldLabelProps) {
  return <p className="text-base font-semibold text-foreground">{text}</p>
}

function timeToMinutes(value: string) {
  const [hour, min] = value.split(":").map(Number)
  return hour * 60 + min
}
