"use client"

import { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Ban, Calendar, Clock3, Lock, Plus, Trash2, X, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react"
import { useDateBlocks } from "@/context/DateBlockContext"
import { useTimeBlocks } from "@/context/TimeBlockContext"
import { useAppointments } from "@/context/AppointmentContext"
import { useSettings } from "@/context/SettingsContext"
import { generateTimeSlots, getAvailableSlots, timeToMinutes } from "@/lib/scheduleUtils"
import { readOrganizationData, DayKey } from "@/lib/admin-organization"
import DatePicker from "@/components/booking/DatePicker"
import RangeDatePicker from "@/components/admin/RangeDatePicker"
import type { WorkBlock } from "@/types/WorkBlock"

const DAY_OPTIONS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
]
const MIN_DATE = new Date(2026, 1, 20)
const MAX_DATE = new Date(2030, 11, 31)

export default function HorariosPage() {
  const { settings, updateSettings } = useSettings()
  const [organizationData, setOrganizationData] = useState(() => readOrganizationData())
  const { dateBlocks, createDateBlock, deleteDateBlock } = useDateBlocks()
  const { timeBlocks, createTimeBlock, deleteTimeBlock } = useTimeBlocks()
  const { appointments } = useAppointments()

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [dateReason, setDateReason] = useState("")

  const [slotDate, setSlotDate] = useState(today)
  const [slotReason, setSlotReason] = useState("")
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [isSuccessSlot, setIsSuccessSlot] = useState(false)
  const [isSuccessDate, setIsSuccessDate] = useState(false)

  const workBlocks = useMemo<WorkBlock[]>(
    () => mapSchedulesToWorkBlocks(organizationData.schedules),
    [organizationData.schedules]
  )

  const generatedSlots = useMemo(
    () => generateTimeSlots(slotDate, workBlocks, settings),
    [slotDate, workBlocks, settings]
  )

  const availableSlots = useMemo(
    () =>
      getAvailableSlots({
        date: slotDate,
        workBlocks,
        settings,
        dateBlocks,
        timeBlocks,
        appointments,
      }),
    [slotDate, workBlocks, settings, dateBlocks, timeBlocks, appointments]
  )

  const blockDateRange = () => {
    if (!dateFrom || !dateTo) return
    if (dateTo < dateFrom) return

    createDateBlock({
      startDate: dateFrom,
      endDate: dateTo,
      reason: dateReason.trim(),
    })

    setDateReason("")
    setIsSuccessDate(true)
    setTimeout(() => setIsSuccessDate(false), 2000)
  }

  const blockSpecificTimes = () => {
    if (!slotDate || selectedSlots.length === 0) return

    selectedSlots.forEach((time) => {
      createTimeBlock({
        date: slotDate,
        time,
        reason: slotReason.trim(),
      })
    })

    setSelectedSlots([])
    setIsSuccessSlot(true)
    setTimeout(() => setIsSuccessSlot(false), 2000)
  }

  const blockAllTimes = () => {
    if (!slotDate || generatedSlots.length === 0) return

    generatedSlots.forEach((time) => {
      // Evitar duplicados si ya está bloqueado
      if (!timeBlocks.some(b => b.date === slotDate && b.time === time)) {
        createTimeBlock({
          date: slotDate,
          time,
          reason: slotReason.trim() || "Bloqueo total",
        })
      }
    })

    setSelectedSlots([])
    setSlotReason("")
    setIsSuccessSlot(true)
    setTimeout(() => setIsSuccessSlot(false), 2000)
  }

  const unlockAllTimes = () => {
    if (!slotDate) return

    // Obtenemos todos los bloques de ese día y los eliminamos
    const blocksToDelete = timeBlocks.filter((b) => b.date === slotDate)

    if (blocksToDelete.length === 0) return

    blocksToDelete.forEach((b) => deleteTimeBlock(b.id))

    setSelectedSlots([])
    setIsSuccessSlot(true)
    setTimeout(() => setIsSuccessSlot(false), 2000)
  }

  const toggleSlotSelection = (time: string) => {
    setSelectedSlots(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    )
  }



  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Disponibilidad</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight">Horarios y bloqueos</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Controla dias bloqueados y franjas horarias no disponibles.
        </p>
      </header>



      {/* Bloqueo de Días */}
      <section className="glass-card mb-10 overflow-visible">
        <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Ban size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold leading-none">Bloqueo de Días (Vacaciones)</h2>
              <p className="mt-1 text-[11px] text-muted font-medium">Bloquea fechas completas</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          <div className="p-5 border-r border-border/10">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Período de bloqueo</p>
                <RangeDatePicker
                  startDate={dateFrom}
                  endDate={dateTo}
                  onChange={(start: string, end: string) => {
                    setDateFrom(start)
                    setDateTo(end)
                  }}
                  className="!h-10 !text-[13px]"
                  placeholder="Selecciona el inicio y fin..."
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Motivo (opcional)</p>
                <input
                  value={dateReason}
                  onChange={(e) => setDateReason(e.target.value)}
                  placeholder="Ej: Vacaciones, Feriado..."
                  className="h-10 w-full rounded-xl border border-border/30 bg-card/30 px-4 text-[13px] font-medium outline-none focus:ring-1 focus:ring-foreground/10 transition-all"
                />
              </div>

              <button
                onClick={blockDateRange}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-white text-[13px] font-bold shadow-lg shadow-[rgba(37,99,235,0.22)] transition-all hover:bg-[var(--accent-strong)] active:scale-[0.98]"
              >
                <Plus size={14} />
                Confirmar Bloqueo de Fechas
              </button>

              <AnimatePresence>
                {isSuccessDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-500"
                  >
                    <CheckCircle2 size={12} />
                    Bloqueo de rango aplicado
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="p-5 bg-white/[0.01]">
            <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1 mb-3">Bloqueos activos</p>
            <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
              {dateBlocks.length === 0 ? (
                <p className="text-[12px] text-muted/30 italic py-2">No hay bloqueos de días activos</p>
              ) : (
                dateBlocks.map((block) => (
                  <article key={block.id} className="flex items-center justify-between rounded-2xl bg-foreground/[0.02] p-4 border border-border/5 hover:bg-foreground/[0.04] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                        <Ban size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold">{formatDate(block.startDate)}</span>
                          <ArrowRight size={10} className="text-muted/30" />
                          <span className="text-[13px] font-bold">{formatDate(block.endDate)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted font-medium italic">{block.reason || "Bloqueo de período"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDateBlock(block.id)}
                      className="rounded-xl p-2 text-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card mb-8 overflow-hidden">
        <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold leading-none">Gestión de Horarios por Día</h2>
              <p className="mt-1 text-[11px] text-muted font-medium">Bloquea turnos específicos por fecha</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
          {/* Configuración */}
          <div className="p-5 lg:col-span-5 lg:border-r lg:border-border/10">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Seleccionar Fecha</label>
                <DatePicker
                  value={slotDate}
                  onChange={setSlotDate}
                  isBlocked={() => false}
                  className="!h-11 !text-[13px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Motivo del bloqueo (opcional)</label>
                <input
                  value={slotReason}
                  onChange={(e) => setSlotReason(e.target.value)}
                  placeholder="Ej: Almuerzo, Trámite personal..."
                  className="h-11 w-full rounded-xl border border-border/30 bg-card/30 px-4 text-[13px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted/30 transition-all"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={blockSpecificTimes}
                    disabled={selectedSlots.length === 0}
                    className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.98] ${selectedSlots.length > 0
                      ? "bg-[var(--accent)] text-white shadow-lg shadow-[rgba(37,99,235,0.22)] hover:bg-[var(--accent-strong)]"
                      : "bg-muted/10 text-muted opacity-50 cursor-not-allowed"
                      }`}
                  >
                    <Lock size={14} />
                    Bloquear seleccionados ({selectedSlots.length})
                  </button>
                  <button
                    onClick={blockAllTimes}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 text-[13px] font-bold text-red-500 transition-all hover:bg-red-500/20 active:scale-[0.98]"
                  >
                    Bloquear Todo
                  </button>
                </div>

                <button
                  onClick={unlockAllTimes}
                  disabled={timeBlocks.filter(b => b.date === slotDate).length === 0}
                  className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.98] ${timeBlocks.filter(b => b.date === slotDate).length > 0
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    : "bg-muted/5 text-muted/30 cursor-not-allowed"
                    }`}
                >
                  <X size={14} />
                  Desbloquear todos los horarios
                </button>
              </div>

              <AnimatePresence>
                {isSuccessSlot && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-500"
                  >
                    <CheckCircle2 size={12} />
                    Bloqueos aplicados correctamente
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="p-5 lg:col-span-7 bg-white/[0.01]">
            <div className="mb-4 flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">
                Horarios disponibles para bloquear
              </label>
              {selectedSlots.length > 0 && (
                <button
                  onClick={() => setSelectedSlots([])}
                  className="text-[10px] font-bold text-foreground/40 hover:text-foreground transition-colors"
                >
                  Limpiar selección
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {generatedSlots.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-center text-muted/40">
                  <AlertCircle size={24} className="mb-2 opacity-20" />
                  <p className="text-[12px] font-semibold">No hay horarios configurados para este día</p>
                </div>
              ) : (
                generatedSlots.map((time) => {
                  const isBlocked = timeBlocks.some(b => b.date === slotDate && b.time === time)
                  const isSelected = selectedSlots.includes(time)

                  return (
                    <motion.button
                      key={time}
                      whileHover={!isBlocked ? { scale: 1.05 } : {}}
                      whileTap={!isBlocked ? { scale: 0.95 } : {}}
                      onClick={() => !isBlocked && toggleSlotSelection(time)}
                      className={`relative flex h-10 items-center justify-center rounded-xl border text-[13px] font-bold transition-all duration-300 overflow-hidden ${isBlocked
                        ? "border-red-500/20 bg-red-500/5 text-red-500/40 cursor-not-allowed group"
                        : isSelected
                          ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)] shadow-[0_8px_18px_rgba(37,99,235,0.18)]"
                          : "border-border/30 bg-card/30 text-muted hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                        }`}
                    >
                      {isBlocked && (
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                          <div className="absolute h-full w-[1px] bg-red-500 left-1/2 top-0 -rotate-45" />
                        </div>
                      )}

                      {time}

                      {isBlocked && (
                        <div className="absolute right-1 bottom-1">
                          <Lock size={8} />
                        </div>
                      )}
                    </motion.button>
                  )
                })
              )}
            </div>

            <div className="mt-8 border-t border-border/10 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">
                  Bloqueos activos ({timeBlocks.filter(b => b.date === slotDate).length})
                </label>
              </div>

              <div className="max-h-[150px] overflow-y-auto no-scrollbar space-y-2">
                {timeBlocks.filter(b => b.date === slotDate).length === 0 ? (
                  <p className="text-[12px] text-muted/30 italic py-2">No hay bloqueos guardados para este día.</p>
                ) : (
                  timeBlocks.filter(b => b.date === slotDate).map((block) => (
                    <article key={block.id} className="flex items-center justify-between rounded-xl bg-foreground/[0.03] p-3 border border-border/5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                          <Lock size={12} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold leading-none">{block.time}</p>
                          <p className="mt-1 text-[10px] text-muted font-medium">{block.reason || "Sin motivo"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTimeBlock(block.id)}
                        className="rounded-lg p-1.5 text-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="theme-card-surface mt-8 rounded-xl border border-surface p-4">
        <h2 className="mb-4 text-lg font-semibold">Ajustes Globales</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Descanso (min)"><input type="number" value={settings.breakDuration} onChange={(e) => updateSettings({ breakDuration: Number(e.target.value) || 0 })} className="theme-field w-full rounded-xl border border-surface px-3 py-2 text-sm" /></Field>
          <Field label="Anticipación mínima (min)"><input type="number" value={settings.minAdvanceBooking} onChange={(e) => updateSettings({ minAdvanceBooking: Number(e.target.value) || 0 })} className="theme-field w-full rounded-xl border border-surface px-3 py-2 text-sm" /></Field>
          <Field label="Máx reservas por día"><input type="number" value={settings.maxBookingsPerDay ?? ""} onChange={(e) => updateSettings({ maxBookingsPerDay: e.target.value === "" ? null : Number(e.target.value) })} className="theme-field w-full rounded-xl border border-surface px-3 py-2 text-sm" /></Field>
        </div>
      </section>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{label}</p>
      {children}
    </div>
  )
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}



function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function mapSchedulesToWorkBlocks(
  schedules: ReturnType<typeof readOrganizationData>["schedules"]
): WorkBlock[] {
  const dayToWeekNumber: Record<keyof typeof schedules, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  const blocks: WorkBlock[] = []

  Object.entries(schedules).forEach(([dayKey, daySchedule]) => {
    if (!daySchedule.active) return

    daySchedule.blocks.forEach((block) => {
      blocks.push({
        id: `${dayKey}-${block.id}`,
        daysOfWeek: [dayToWeekNumber[dayKey as keyof typeof schedules]],
        startTime: block.start,
        endTime: block.end,
        enabled: true,
        createdAt: new Date().toISOString(),
      })
    })
  })

  return blocks
}
