"use client"

import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3,
  ChevronDown,
  Download,
  DollarSign,
  EyeOff,
  UserRound,
  UserRoundPlus,
  Users,
  Clock3,
  TrendingUp,
  Calendar,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { useAppointments } from "@/context/AppointmentContext"
import { useHasMounted } from "@/hooks/useHasMounted"
import type { Appointment } from "@/types/Appointment"

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires"
const MIN_MONTH = new Date(2026, 1, 1)
const MAX_MONTH = new Date(2030, 11, 1)

type IncomeTab = "resumen" | "metricas"

export default function IngresosPage() {
  const { appointments } = useAppointments()

  const nowArgentina = useMemo(() => getNowArgentina(), [])
  const defaultMonth = useMemo(() => clampMonth(startOfMonth(nowArgentina), MIN_MONTH, MAX_MONTH), [nowArgentina])

  const [activeTab, setActiveTab] = useState<IncomeTab>("resumen")
  const [selectedMonthKey, setSelectedMonthKey] = useState(toMonthKey(defaultMonth))
  const hasMounted = useHasMounted()

  const monthOptions = useMemo(() => buildMonthOptions(MIN_MONTH, MAX_MONTH), [])
  const selectedMonth = useMemo(() => fromMonthKey(selectedMonthKey), [selectedMonthKey])
  const previousMonth = useMemo(() => addMonths(selectedMonth, -1), [selectedMonth])

  const currentMonthAppointments = useMemo(
    () => appointments.filter((item) => item.date.startsWith(`${toMonthKey(selectedMonth)}-`)),
    [appointments, selectedMonth]
  )

  const previousMonthAppointments = useMemo(
    () => appointments.filter((item) => item.date.startsWith(`${toMonthKey(previousMonth)}-`)),
    [appointments, previousMonth]
  )

  const totals = useMemo(() => {
    const clientsBase = currentMonthAppointments.filter((item: Appointment) => isClientStatus(item.status))
    const completed = currentMonthAppointments.filter((item: Appointment) => item.status === "completed")

    const uniqueClients = uniqueClientKeys(clientsBase)
    const totalIncome = completed.reduce((acc: number, item: Appointment) => acc + item.price, 0)

    const weeklyClients = [0, 0, 0, 0, 0]
    const weeklyIncome = [0, 0, 0, 0, 0]

    completed.forEach((item: Appointment) => {
      const weekIndex = getWeekIndexInMonth(item.date)
      weeklyIncome[weekIndex] += item.price
    })

    for (let week = 0; week < 5; week += 1) {
      const set = new Set<string>()
      clientsBase.forEach((item: Appointment) => {
        if (getWeekIndexInMonth(item.date) === week) {
          set.add(makeClientKey(item))
        }
      })
      weeklyClients[week] = set.size
    }

    return {
      totalClients: uniqueClients.size,
      totalIncome,
      weeklyClients,
      weeklyIncome,
    }
  }, [currentMonthAppointments])

  const metrics = useMemo(() => {
    const currentClientsBase = currentMonthAppointments.filter((item: Appointment) => isClientStatus(item.status))
    const previousClientsBase = previousMonthAppointments.filter((item: Appointment) => isClientStatus(item.status))

    const currentClients = uniqueClientKeys(currentClientsBase)
    const previousClients = uniqueClientKeys(previousClientsBase)

    const historicBeforeCurrent = new Set<string>()
    appointments.forEach((item: Appointment) => {
      if (toMonthKeyFromDateKey(item.date) < toMonthKey(selectedMonth) && isClientStatus(item.status)) {
        historicBeforeCurrent.add(makeClientKey(item))
      }
    })

    let newClients = 0
    let recurrentClients = 0
    currentClients.forEach((key: string) => {
      if (historicBeforeCurrent.has(key)) recurrentClients += 1
      else newClients += 1
    })

    const hourDemand = new Map<string, number>()
    currentMonthAppointments.filter((item: Appointment) => item.status === "completed").forEach((item: Appointment) => {
      hourDemand.set(item.time, (hourDemand.get(item.time) ?? 0) + 1)
    })
    const topHours = [...hourDemand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)

    const noShowCount = currentMonthAppointments.filter(
      (item: Appointment) => item.status === "no_vino_no_aviso" || item.status === "no_show"
    ).length
    const noShowRate = currentMonthAppointments.length > 0 ? (noShowCount / currentMonthAppointments.length) * 100 : 0

    const currentIncome = currentMonthAppointments.filter((item: Appointment) => item.status === "completed").reduce((acc: number, item: Appointment) => acc + item.price, 0)
    const previousIncome = previousMonthAppointments.filter((item: Appointment) => item.status === "completed").reduce((acc: number, item: Appointment) => acc + item.price, 0)

    return {
      newClients,
      recurrentClients,
      topHours,
      noShowCount,
      noShowRate,
      comparisonClientsPct: percentageDiff(currentClients.size, previousClients.size),
      comparisonIncomePct: percentageDiff(currentIncome, previousIncome),
      previousMonthLabel: monthLabel(previousMonth),
    }
  }, [appointments, currentMonthAppointments, previousMonthAppointments, selectedMonth, previousMonth])

  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const downloadSummary = () => {
    const lines = [
      ["Mes", monthLabel(selectedMonth)],
      ["Total clientes", String(totals.totalClients)],
      ["Ingresos finales", String(totals.totalIncome)],
      ["Semana", "Clientes", "Ingresos"],
      ...Array.from({ length: 5 }, (_, index) => [
        `Semana ${index + 1}`,
        String(totals.weeklyClients[index]),
        String(totals.weeklyIncome[index]),
      ]),
    ]

    const csv = lines.map((line) => line.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `resumen-ingresos-${toMonthKey(selectedMonth)}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  const handleMonthChange = (key: string) => {
    setSelectedMonthKey(key)
    setIsPickerOpen(false)
  }

  if (!hasMounted) {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 text-center">
        <p className="text-muted italic animate-pulse">Cargando ingresos...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Analitica</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight">Panel de ingresos</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Visualiza rendimiento mensual, tendencia y conversion operativa.
        </p>
      </header>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <DollarSign size={20} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold leading-none">{monthLabel(selectedMonth)}</h2>
            <p className="mt-1 text-[11px] text-muted font-medium">Facturación y estadísticas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom Month Picker */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="flex h-10 items-center gap-2 rounded-xl border border-border/30 bg-card/30 px-4 text-[13px] font-bold text-foreground transition-all hover:bg-card/50"
            >
              <Calendar size={14} className="text-muted" />
              {monthLabel(selectedMonth)}
              <ChevronDown size={14} className={`text-muted transition-transform duration-300 ${isPickerOpen ? "rotate-180" : ""}`} />
            </motion.button>

            <AnimatePresence>
              {isPickerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]"
                    onClick={() => setIsPickerOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="absolute right-0 top-full z-50 mt-2 h-[280px] w-[240px] overflow-y-auto rounded-3xl border border-border/50 bg-card/90 p-2 shadow-2xl backdrop-blur-2xl no-scrollbar"
                  >
                    <div className="p-2">
                      <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2 px-2">Seleccionar Período</p>
                    </div>
                    {monthOptions.map((option: { value: string; label: string }) => (
                      <button
                        key={option.value}
                        onClick={() => handleMonthChange(option.value)}
                        className={`flex w-full items-center gap-3 border-none bg-transparent rounded-2xl px-4 py-3 text-left text-[13px] font-bold transition-all ${selectedMonthKey === option.value
                          ? "bg-[var(--accent)] text-white"
                          : "text-foreground/70 hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-foreground"
                          }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${selectedMonthKey === option.value ? "bg-white" : "bg-transparent"}`} />
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={downloadSummary}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/30 bg-card/30 text-foreground transition-all hover:bg-card/50 active:scale-95"
            title="Descargar CSV"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-border/10 bg-card/30 p-1.5">
        <TabButton active={activeTab === "resumen"} onClick={() => setActiveTab("resumen")} icon={<DollarSign size={16} />} label="Resumen General" />
        <TabButton active={activeTab === "metricas"} onClick={() => setActiveTab("metricas")} icon={<BarChart3 size={16} />} label="Métricas Detalladas" />
      </div>

      {activeTab === "resumen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              icon={<Users size={18} />}
              title="Clientes Atendidos"
              value={String(totals.totalClients)}
              trend={metrics.comparisonClientsPct}
              description="Basado en completados y no-shows"
              accent
            />
            <StatCard
              icon={<DollarSign size={18} />}
              title="Facturación Total"
              value={formatMoney(totals.totalIncome)}
              trend={metrics.comparisonIncomePct}
              description="Solo turnos marcados como completados"
              accent
            />
          </div>

          <ChartCard
            title="Control de Clientela"
            icon={<UserRound size={18} />}
            summary={`Total de clientes únicos este mes: ${totals.totalClients}`}
          >
            <WeekBarChart values={totals.weeklyClients} max={Math.max(1, ...totals.weeklyClients)} color="bg-[var(--accent)]" />
          </ChartCard>

          <ChartCard
            title="Facturación Semanal"
            icon={<DollarSign size={18} className="text-emerald-500" />}
            summary={`Ingresos acumulados del período: ${formatMoney(totals.totalIncome)}`}
          >
            <WeekBarChart values={totals.weeklyIncome} max={Math.max(1, ...totals.weeklyIncome)} color="bg-emerald-500" money />
          </ChartCard>
        </div>
      )}

      {activeTab === "metricas" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="glass-card overflow-hidden">
            <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4 flex items-center gap-2">
              <Users size={16} className="text-muted" />
              <h3 className="text-[14px] font-bold">Distribución de Clientes</h3>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <UserRoundPlus size={14} />
                    </div>
                    <span className="text-[13px] font-semibold text-muted">Nuevos</span>
                  </div>
                  <span className="text-[15px] font-bold">{metrics.newClients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                      <UserRound size={14} />
                    </div>
                    <span className="text-[13px] font-semibold text-muted">Recurrentes</span>
                  </div>
                  <span className="text-[15px] font-bold">{metrics.recurrentClients}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-border/10">
                  <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest leading-none">Total Unicicidad</p>
                  <p className="mt-2 text-2xl font-bold">{metrics.newClients + metrics.recurrentClients}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4 flex items-center gap-2">
              <Clock3 size={16} className="text-muted" />
              <h3 className="text-[14px] font-bold">Horas de Mayor Demanda</h3>
            </div>
            <div className="p-5 space-y-4">
              {metrics.topHours.length === 0 ? (
                <p className="text-[12px] text-muted italic">Sin datos registrados...</p>
              ) : (
                metrics.topHours.map(([time, count]: [string, number]) => {
                  const maxCount = metrics.topHours[0][1]
                  const percentage = (count / maxCount) * 100
                  return (
                    <div key={time} className="space-y-2">
                      <div className="flex justify-between text-[12px] font-bold">
                        <span>{time} hs</span>
                        <span className="text-muted">{count} turnos</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-[var(--accent)]"
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4 flex items-center gap-2">
              <EyeOff size={16} className="text-rose-500" />
              <h3 className="text-[14px] font-bold">Faltas y Cancelaciones</h3>
            </div>
            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-rose-500">{metrics.noShowRate.toFixed(1)}%</p>
                  <p className="mt-1 text-[12px] font-semibold text-muted">Tasa de No-Show</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{metrics.noShowCount}</p>
                  <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest">Incidentes</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-rose-500/10">
                <div className="h-full bg-rose-500" style={{ width: `${metrics.noShowRate}%` }} />
              </div>
            </div>
          </section>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-muted" />
              <h3 className="text-[14px] font-bold">Vs. Período Anterior ({metrics.previousMonthLabel})</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest">Crec. Clientes</p>
                <div className={`flex items-center gap-1 text-[17px] font-bold ${metrics.comparisonClientsPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {metrics.comparisonClientsPct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {formatPercent(metrics.comparisonClientsPct)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest">Crec. Ingresos</p>
                <div className={`flex items-center gap-1 text-[17px] font-bold ${metrics.comparisonIncomePct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {metrics.comparisonIncomePct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {formatPercent(metrics.comparisonIncomePct)}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function isClientStatus(status: Appointment["status"]) {
  return (
    status === "completed" ||
    status === "no_vino_aviso" ||
    status === "no_vino_no_aviso" ||
    status === "no_show_with_notice" ||
    status === "no_show"
  )
}

type TabButtonProps = {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all duration-300 ${active
        ? "bg-[var(--accent)] text-white shadow-lg shadow-[rgba(37,99,235,0.24)]"
        : "text-muted hover:text-foreground hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
        }`}
    >
      {icon}
      {label}
    </motion.button>
  )
}

type StatCardProps = {
  icon: React.ReactElement<{ size?: number }>
  title: string;
  value: string;
  accent?: boolean;
  trend?: number;
  description?: string;
}
function StatCard({ icon, title, value, accent, trend, description }: StatCardProps) {
  const isPositive = (trend || 0) >= 0

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      className="glass-card relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            }`}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest">{title}</p>
        <p className={`mt-1 text-3xl font-bold tracking-tight ${accent ? "text-emerald-500" : "text-foreground"}`}>
          {value}
        </p>
      </div>

      {description && (
        <p className="mt-4 text-[11px] font-medium text-muted/40">{description}</p>
      )}

      {/* Background Decor */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-foreground rotate-12 pointer-events-none">
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </motion.article>
  )
}

type ChartCardProps = { title: string; icon: React.ReactNode; summary: string; children: React.ReactNode }
function ChartCard({ title, icon, summary, children }: ChartCardProps) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="text-muted">{icon}</div>
          <h3 className="text-[14px] font-bold leading-none">{title}</h3>
        </div>
      </div>
      <div className="p-6">
        {children}
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-card/30 py-2 px-4">
          <p className="text-[12px] font-bold text-[#F2F2F2]">{summary}</p>
        </div>
      </div>
    </section>
  )
}

function WeekBarChart({ values, max, color, money }: { values: number[]; max: number; color: string; money?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {values.map((value, index) => {
        const ratio = max > 0 ? value / max : 0
        const height = Math.max(4, ratio * 100)
        return (
          <div key={index} className="group flex flex-col items-center">
            <div className="relative flex h-32 w-full items-end justify-center rounded-2xl bg-card/30 p-1 transition-all duration-300 group-hover:bg-card/50">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 1, ease: "circOut", delay: index * 0.1 }}
                className={`w-full max-w-[32px] rounded-xl shadow-lg shadow-[rgba(37,99,235,0.22)] ${color}`}
              />

              {/* Tooltip on hover */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-300 group-hover:-top-10 group-hover:opacity-100">
                <div className="rounded-lg bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-white shadow-xl">
                  {money ? formatMoney(value) : `${value} cli.`}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted/40 group-hover:text-muted transition-colors">Sem {index + 1}</p>
          </div>
        )
      })}
    </div>
  )
}

function uniqueClientKeys(appointments: Appointment[]) {
  const set = new Set<string>()
  appointments.forEach((item) => set.add(makeClientKey(item)))
  return set
}

function makeClientKey(item: Appointment) {
  const phone = item.clientPhone.trim()
  if (phone) return `phone:${phone}`
  return `name:${item.clientName.trim().toLowerCase()}`
}

function getWeekIndexInMonth(dateKey: string) {
  const day = Number(dateKey.slice(8, 10))
  if (!Number.isFinite(day) || day <= 0) return 0
  return Math.min(4, Math.floor((day - 1) / 7))
}

function toMonthKeyFromDateKey(dateKey: string) { return dateKey.slice(0, 7) }
function percentageDiff(current: number, previous: number) { if (previous === 0) return current === 0 ? 0 : 200; return ((current - previous) / previous) * 100 }
function formatPercent(value: number) { const sign = value >= 0 ? "+" : ""; return `${sign}${value.toFixed(1)}%` }
function formatMoney(value: number) { return `$ ${value.toLocaleString("es-AR")}` }
function formatMoneyShort(value: number) { if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`; return `$${value}` }
function getNowArgentina() { const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }); const [year, month, day] = formatter.format(new Date()).split("-").map(Number); return new Date(year, month - 1, day) }
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1) }
function addMonths(date: Date, months: number) { return new Date(date.getFullYear(), date.getMonth() + months, 1) }
function clampMonth(date: Date, min: Date, max: Date) { const value = toMonthKey(date); if (value < toMonthKey(min)) return min; if (value > toMonthKey(max)) return max; return date }
function buildMonthOptions(min: Date, max: Date) { const options: Array<{ value: string; label: string }> = []; let cursor = new Date(min.getFullYear(), min.getMonth(), 1); while (toMonthKey(cursor) <= toMonthKey(max)) { options.push({ value: toMonthKey(cursor), label: monthLabel(cursor) }); cursor = addMonths(cursor, 1) } return options }
function toMonthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` }
function fromMonthKey(value: string) { const [year, month] = value.split("-").map(Number); return new Date(year, month - 1, 1) }
function monthLabel(date: Date) { const value = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date); return value.charAt(0).toUpperCase() + value.slice(1) }
