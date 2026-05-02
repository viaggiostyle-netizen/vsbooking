"use client"

import React, { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronDown,
  Clock3,
  DollarSign,
  Download,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  UserRoundPlus,
  Users,
} from "lucide-react"
import { useAppointments } from "@/context/AppointmentContext"
import { useHasMounted } from "@/hooks/useHasMounted"
import {
  buildClientKeyFromAppointment,
  buildDailyPerformance,
  buildHourPerformance,
  buildServicePerformance,
  buildWeekdayPerformance,
  formatDateKeyShort,
  formatWeekdayShort,
  isBookedAppointment,
  isCompletedAppointment,
  isOperationalClientAppointment,
} from "@/lib/admin-insights"
import type { Appointment } from "@/types/Appointment"

const ARGENTINA_TZ = "America/Buenos_Aires"
const MIN_MONTH = new Date(2026, 1, 1)
const MAX_MONTH = new Date(2030, 11, 1)

type IncomeTab = "resumen" | "metricas"

export default function IngresosPage() {
  const { appointments } = useAppointments()
  const hasMounted = useHasMounted()
  const nowArgentina = useMemo(() => getNowArgentina(), [])
  const defaultMonth = useMemo(
    () => clampMonth(startOfMonth(nowArgentina), MIN_MONTH, MAX_MONTH),
    [nowArgentina]
  )

  const [activeTab, setActiveTab] = useState<IncomeTab>("resumen")
  const [selectedMonthKey, setSelectedMonthKey] = useState(toMonthKey(defaultMonth))
  const [isPickerOpen, setIsPickerOpen] = useState(false)

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

  const completedAppointments = useMemo(
    () => currentMonthAppointments.filter(isCompletedAppointment),
    [currentMonthAppointments]
  )
  const bookedAppointments = useMemo(
    () => currentMonthAppointments.filter(isBookedAppointment),
    [currentMonthAppointments]
  )

  const weeklyOverview = useMemo(() => {
    const weeklyClients = [0, 0, 0, 0, 0]
    const weeklyIncome = [0, 0, 0, 0, 0]

    completedAppointments.forEach((item) => {
      const weekIndex = getWeekIndexInMonth(item.date)
      weeklyIncome[weekIndex] += item.price
    })

    for (let week = 0; week < 5; week += 1) {
      const set = new Set<string>()
      bookedAppointments.forEach((item) => {
        if (getWeekIndexInMonth(item.date) === week) {
          set.add(buildClientKeyFromAppointment(item))
        }
      })
      weeklyClients[week] = set.size
    }

    return { weeklyClients, weeklyIncome }
  }, [bookedAppointments, completedAppointments])

  const businessMetrics = useMemo(() => {
    const totalIncome = completedAppointments.reduce((sum, item) => sum + item.price, 0)
    const uniqueClients = new Set(bookedAppointments.map(buildClientKeyFromAppointment))
    const servicePerformance = buildServicePerformance(currentMonthAppointments)
    const weekdayPerformance = buildWeekdayPerformance(currentMonthAppointments).filter(
      (item) => item.weekday !== 0
    )
    const hourPerformance = buildHourPerformance(currentMonthAppointments)
    const dailyPerformance = buildDailyPerformance(currentMonthAppointments)
    const operationalAppointments = currentMonthAppointments.filter(isOperationalClientAppointment)
    const previousOperational = previousMonthAppointments.filter(isOperationalClientAppointment)

    const currentOperationalClients = new Set(
      operationalAppointments.map(buildClientKeyFromAppointment)
    )
    const previousOperationalClients = new Set(
      previousOperational.map(buildClientKeyFromAppointment)
    )
    const historicClientsBeforeCurrent = new Set<string>()

    appointments.forEach((item) => {
      if (toMonthKeyFromDateKey(item.date) < toMonthKey(selectedMonth) && isOperationalClientAppointment(item)) {
        historicClientsBeforeCurrent.add(buildClientKeyFromAppointment(item))
      }
    })

    let newClients = 0
    let recurrentClients = 0
    currentOperationalClients.forEach((clientKey) => {
      if (historicClientsBeforeCurrent.has(clientKey)) recurrentClients += 1
      else newClients += 1
    })

    return {
      totalIncome,
      uniqueClients: uniqueClients.size,
      completedCount: completedAppointments.length,
      bookedCount: bookedAppointments.length,
      averageTicket: completedAppointments.length > 0 ? totalIncome / completedAppointments.length : 0,
      servicePerformance,
      weekdayPerformance,
      hourPerformance,
      dailyPerformance,
      newClients,
      recurrentClients,
      clientsDelta: percentageDiff(currentOperationalClients.size, previousOperationalClients.size),
      incomeDelta: percentageDiff(
        totalIncome,
        previousMonthAppointments.filter(isCompletedAppointment).reduce((sum, item) => sum + item.price, 0)
      ),
      previousMonthLabel: monthLabel(previousMonth),
    }
  }, [
    appointments,
    bookedAppointments,
    completedAppointments,
    currentMonthAppointments,
    previousMonthAppointments,
    previousMonth,
    selectedMonth,
  ])

  const topServices = businessMetrics.servicePerformance.slice(0, 5)
  const topWeekdays = businessMetrics.weekdayPerformance.slice(0, 5)
  const topHours = businessMetrics.hourPerformance.slice(0, 5)
  const latestDays = businessMetrics.dailyPerformance.slice(0, 7)

  const summaryCards = useMemo(
    () => [
      {
        id: "income-clients",
        title: "Clientes del mes",
        value: String(businessMetrics.uniqueClients),
        accentValue: false,
        subtitle: `${businessMetrics.newClients} nuevos y ${businessMetrics.recurrentClients} recurrentes`,
        icon: <Users size={18} />,
        trend: businessMetrics.clientsDelta,
      },
      {
        id: "income-total",
        title: "Facturacion",
        value: formatMoney(businessMetrics.totalIncome),
        accentValue: true,
        subtitle: `${businessMetrics.completedCount} turnos completados`,
        icon: <DollarSign size={18} />,
        trend: businessMetrics.incomeDelta,
      },
      {
        id: "income-ticket",
        title: "Ticket promedio",
        value: formatMoney(businessMetrics.averageTicket),
        accentValue: false,
        subtitle: "Promedio por turno completado",
        icon: <ReceiptText size={18} />,
      },
      {
        id: "income-services",
        title: "Servicios vendidos",
        value: String(topServices.reduce((sum, item) => sum + item.completedCount, 0)),
        accentValue: false,
        subtitle: topServices[0] ? `${topServices[0].service} lidera el mes` : "Sin servicios completados",
        icon: <Sparkles size={18} />,
      },
    ],
    [businessMetrics, topServices]
  )

  const downloadReport = () => {
    const lines: string[][] = [
      ["Reporte mensual", monthLabel(selectedMonth)],
      ["Facturacion", String(businessMetrics.totalIncome)],
      ["Clientes unicos", String(businessMetrics.uniqueClients)],
      ["Turnos completados", String(businessMetrics.completedCount)],
      ["Ticket promedio", String(Math.round(businessMetrics.averageTicket))],
      [],
      ["Ranking de servicios"],
      ["Servicio", "Turnos", "Facturacion", "Ticket promedio"],
      ...businessMetrics.servicePerformance.map((item) => [
        item.service,
        String(item.completedCount),
        String(item.revenue),
        String(Math.round(item.averageTicket)),
      ]),
      [],
      ["Cierre diario"],
      ["Fecha", "Turnos agendados", "Completados", "Facturacion", "Ticket promedio"],
      ...businessMetrics.dailyPerformance.map((item) => [
        item.date,
        String(item.bookedCount),
        String(item.completedCount),
        String(item.revenue),
        String(Math.round(item.averageTicket)),
      ]),
      [],
      ["Detalle de turnos"],
      ["Fecha", "Hora", "Cliente", "Telefono", "Servicio", "Estado", "Importe"],
      ...currentMonthAppointments.map((item) => [
        item.date,
        item.time,
        item.clientName,
        item.clientPhone,
        item.service,
        item.status,
        String(item.price),
      ]),
    ]

    const csv = lines.map((line) => line.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ingresos-${toMonthKey(selectedMonth)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!hasMounted) {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 text-center">
        <p className="animate-pulse italic text-muted">Cargando ingresos...</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <header className="mb-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Analitica</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight">Panel de ingresos</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Mira facturacion, clientes, servicios y cierres del mes en una sola vista.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-[28px] border border-border/20 bg-card/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold sm:text-[16px]">{monthLabel(selectedMonth)}</h2>
            <p className="mt-1 text-[11px] font-medium text-muted">Resumen comercial y operativo del periodo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsPickerOpen((value) => !value)}
              className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border/30 bg-card/40 px-4 text-[12px] font-bold text-foreground transition-all hover:bg-card/60 sm:w-[220px] sm:text-[13px]"
            >
              <span className="inline-flex min-w-0 items-center gap-2 truncate">
                <Calendar size={14} className="shrink-0 text-muted" />
                <span className="truncate">{monthLabel(selectedMonth)}</span>
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-muted transition-transform duration-300 ${isPickerOpen ? "rotate-180" : ""}`}
              />
            </motion.button>

            <AnimatePresence>
              {isPickerOpen ? (
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
                    className="absolute right-0 top-full z-50 mt-2 h-[280px] w-full overflow-y-auto rounded-3xl border border-border/50 bg-card/90 p-2 shadow-2xl backdrop-blur-2xl no-scrollbar sm:w-[240px]"
                  >
                    <div className="p-2">
                      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/50">
                        Seleccionar periodo
                      </p>
                    </div>
                    {monthOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedMonthKey(option.value)
                          setIsPickerOpen(false)
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border-none bg-transparent px-4 py-3 text-left text-[13px] font-bold transition-all ${
                          selectedMonthKey === option.value
                            ? "bg-[var(--accent)] text-white"
                            : "text-foreground/70 hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-foreground"
                        }`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${
                            selectedMonthKey === option.value ? "bg-white" : "bg-transparent"
                          }`}
                        />
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            onClick={downloadReport}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-card/40 text-foreground transition-all hover:bg-card/60 active:scale-95"
            title="Descargar reporte CSV"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <DashboardSummaryCards cards={summaryCards} />

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border/10 bg-card/30 p-1.5">
        <TabButton
          active={activeTab === "resumen"}
          onClick={() => setActiveTab("resumen")}
          icon={<DollarSign size={16} />}
          label="Resumen"
        />
        <TabButton
          active={activeTab === "metricas"}
          onClick={() => setActiveTab("metricas")}
          icon={<BarChart3 size={16} />}
          label="Metricas"
        />
      </div>

      {activeTab === "resumen" ? (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <ChartCard
              title="Clientes por semana"
              icon={<Users size={18} />}
              summary={`Total de clientes unicos del mes: ${businessMetrics.uniqueClients}`}
            >
              <WeekBarChart
                values={weeklyOverview.weeklyClients}
                max={Math.max(1, ...weeklyOverview.weeklyClients)}
                color="bg-[var(--accent)]"
              />
            </ChartCard>

            <RankingCard
              title="Servicios mas vendidos"
              icon={<Sparkles size={18} className="text-amber-500" />}
              emptyMessage="Todavia no hay servicios completados en el mes."
              rows={topServices.map((item) => ({
                label: item.service,
                value: `${item.completedCount} turnos`,
                detail: formatMoney(item.revenue),
                ratio:
                  businessMetrics.servicePerformance[0]?.completedCount
                    ? (item.completedCount / businessMetrics.servicePerformance[0].completedCount) * 100
                    : 0,
              }))}
              ratioColor="bg-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <ChartCard
              title="Facturacion semanal"
              icon={<DollarSign size={18} className="text-emerald-500" />}
              summary={`Ingreso acumulado del periodo: ${formatMoney(businessMetrics.totalIncome)}`}
            >
              <WeekBarChart
                values={weeklyOverview.weeklyIncome}
                max={Math.max(1, ...weeklyOverview.weeklyIncome)}
                color="bg-emerald-500"
                money
              />
            </ChartCard>

            <SummaryListCard
              title="Cierre diario"
              icon={<ReceiptText size={18} className="text-blue-500" />}
              emptyMessage="No hay movimiento cargado en este mes."
              rows={latestDays.map((item) => ({
                heading: `${formatWeekdayShort(item.date)} ${formatDateKeyShort(item.date)}`,
                primary: formatMoney(item.revenue),
                secondary: `${item.completedCount} completados de ${item.bookedCount} agendados`,
                tertiary:
                  item.completedCount > 0
                    ? `Ticket promedio ${formatMoney(item.averageTicket)}`
                    : "Sin turnos completados",
              }))}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <MetricSplitCard
            title="Distribucion de clientes"
            icon={<UserRound size={18} className="text-emerald-500" />}
            items={[
              {
                label: "Nuevos",
                value: String(businessMetrics.newClients),
                tone: "emerald",
                icon: <UserRoundPlus size={14} />,
              },
              {
                label: "Recurrentes",
                value: String(businessMetrics.recurrentClients),
                tone: "blue",
                icon: <UserRound size={14} />,
              },
            ]}
            footerLabel="Base operativa del mes"
            footerValue={String(businessMetrics.newClients + businessMetrics.recurrentClients)}
          />

          <MetricSplitCard
            title="Comparativa vs periodo anterior"
            icon={<TrendingUp size={18} className="text-violet-500" />}
            items={[
              {
                label: `Clientes vs ${businessMetrics.previousMonthLabel}`,
                value: formatPercent(businessMetrics.clientsDelta),
                tone: businessMetrics.clientsDelta >= 0 ? "emerald" : "rose",
                icon: businessMetrics.clientsDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
              },
              {
                label: `Ingresos vs ${businessMetrics.previousMonthLabel}`,
                value: formatPercent(businessMetrics.incomeDelta),
                tone: businessMetrics.incomeDelta >= 0 ? "emerald" : "rose",
                icon: businessMetrics.incomeDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
              },
            ]}
            footerLabel="Ticket promedio"
            footerValue={formatMoney(businessMetrics.averageTicket)}
          />

          <RankingCard
            title="Dias mas ocupados"
            icon={<Calendar size={18} className="text-sky-500" />}
            emptyMessage="No hay turnos registrados para medir ocupacion."
            rows={topWeekdays.map((item) => ({
              label: item.label,
              value: `${item.bookedCount} turnos`,
              detail: formatMoney(item.revenue),
              ratio:
                businessMetrics.weekdayPerformance[0]?.bookedCount
                  ? (item.bookedCount / businessMetrics.weekdayPerformance[0].bookedCount) * 100
                  : 0,
            }))}
            ratioColor="bg-sky-500"
          />

          <RankingCard
            title="Franjas mas activas"
            icon={<Clock3 size={18} className="text-orange-500" />}
            emptyMessage="No hay horarios registrados en el periodo."
            rows={topHours.map((item) => ({
              label: `${item.time} hs`,
              value: `${item.bookedCount} turnos`,
              detail:
                item.completedCount > 0
                  ? `${item.completedCount} completados`
                  : "Sin completados",
              ratio:
                businessMetrics.hourPerformance[0]?.bookedCount
                  ? (item.bookedCount / businessMetrics.hourPerformance[0].bookedCount) * 100
                  : 0,
            }))}
            ratioColor="bg-orange-500"
          />
        </div>
      )}
    </section>
  )
}

type SummaryCard = {
  id: string
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  accentValue?: boolean
  trend?: number
}

function DashboardSummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const isPositive = card.trend == null || card.trend >= 0

        return (
          <motion.article
            key={card.id}
            whileHover={{ y: -4, scale: 1.01 }}
            className="glass-card relative overflow-hidden p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/5 text-foreground">
                {card.icon}
              </div>
              {card.trend != null ? (
                <div
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${
                    isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  }`}
                >
                  {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(card.trend).toFixed(1)}%
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 sm:text-[11px]">
                {card.title}
              </p>
              <p
                className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${
                  card.accentValue ? "text-emerald-500" : "text-foreground"
                }`}
              >
                {card.value}
              </p>
            </div>

            <p className="mt-4 text-[10px] font-medium text-muted/40 sm:text-[11px]">{card.subtitle}</p>
          </motion.article>
        )
      })}
    </div>
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
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition-all duration-300 sm:text-[13px] ${
        active
          ? "bg-[var(--accent)] text-white shadow-lg shadow-[rgba(37,99,235,0.24)]"
          : "text-muted hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  )
}

type ChartCardProps = {
  title: string
  icon: React.ReactNode
  summary: string
  children: React.ReactNode
}

function ChartCard({ title, icon, summary, children }: ChartCardProps) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="text-muted">{icon}</div>
          <h3 className="text-[14px] font-bold leading-none">{title}</h3>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {children}
        <div className="mt-6 flex items-center justify-center rounded-xl bg-card/30 px-4 py-2">
          <p className="text-center text-[12px] font-bold text-[#F2F2F2]">{summary}</p>
        </div>
      </div>
    </section>
  )
}

function WeekBarChart({
  values,
  max,
  color,
  money,
}: {
  values: number[]
  max: number
  color: string
  money?: boolean
}) {
  return (
    <div className="grid grid-cols-5 gap-3 sm:gap-4">
      {values.map((value, index) => {
        const ratio = max > 0 ? value / max : 0
        const height = Math.max(4, ratio * 100)
        return (
          <div key={index} className="group flex flex-col items-center">
            <div className="relative flex h-28 w-full items-end justify-center rounded-2xl bg-card/30 p-1 sm:h-32">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.8, ease: "circOut", delay: index * 0.08 }}
                className={`w-full max-w-[32px] rounded-xl shadow-lg shadow-[rgba(37,99,235,0.22)] ${color}`}
              />

              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-300 group-hover:-top-10 group-hover:opacity-100">
                <div className="rounded-lg bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-white shadow-xl">
                  {money ? formatMoney(value) : `${value} cli.`}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted/40 transition-colors group-hover:text-muted">
              Sem {index + 1}
            </p>
          </div>
        )
      })}
    </div>
  )
}

type RankingRow = {
  label: string
  value: string
  detail: string
  ratio: number
}

function RankingCard({
  title,
  icon,
  rows,
  ratioColor,
  emptyMessage,
}: {
  title: string
  icon: React.ReactNode
  rows: RankingRow[]
  ratioColor: string
  emptyMessage: string
}) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[14px] font-bold leading-none">{title}</h3>
        </div>
      </div>
      <div className="p-5">
        {rows.length === 0 ? (
          <p className="text-[12px] italic text-muted">{emptyMessage}</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={`${row.label}-${row.value}`} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-foreground">{row.label}</p>
                    <p className="mt-1 text-[11px] font-medium text-muted">{row.detail}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-bold text-foreground">{row.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-foreground/5">
                  <div className={`h-full ${ratioColor}`} style={{ width: `${row.ratio}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

type SummaryListRow = {
  heading: string
  primary: string
  secondary: string
  tertiary: string
}

function SummaryListCard({
  title,
  icon,
  rows,
  emptyMessage,
}: {
  title: string
  icon: React.ReactNode
  rows: SummaryListRow[]
  emptyMessage: string
}) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[14px] font-bold leading-none">{title}</h3>
        </div>
      </div>
      <div className="p-5">
        {rows.length === 0 ? (
          <p className="text-[12px] italic text-muted">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <article
                key={row.heading}
                className="rounded-2xl border border-border/20 bg-card/20 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-foreground">{row.heading}</p>
                  <span className="text-[13px] font-bold text-emerald-500">{row.primary}</span>
                </div>
                <p className="mt-2 text-[12px] font-medium text-foreground/80">{row.secondary}</p>
                <p className="mt-1 text-[11px] font-medium text-muted">{row.tertiary}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

type MetricSplitItem = {
  label: string
  value: string
  tone: "emerald" | "blue" | "rose"
  icon: React.ReactNode
}

function MetricSplitCard({
  title,
  icon,
  items,
  footerLabel,
  footerValue,
}: {
  title: string
  icon: React.ReactNode
  items: MetricSplitItem[]
  footerLabel: string
  footerValue: string
}) {
  const toneClassMap: Record<MetricSplitItem["tone"], string> = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
    rose: "bg-rose-500/10 text-rose-500",
  }

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-border/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[14px] font-bold leading-none">{title}</h3>
        </div>
      </div>
      <div className="space-y-4 p-5">
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClassMap[item.tone]}`}>
                {item.icon}
              </div>
              <span className="text-[12px] font-semibold text-muted sm:text-[13px]">{item.label}</span>
            </div>
            <span className="shrink-0 text-[15px] font-bold sm:text-[17px]">{item.value}</span>
          </div>
        ))}

        <div className="border-t border-border/10 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted/50">{footerLabel}</p>
          <p className="mt-2 text-2xl font-bold">{footerValue}</p>
        </div>
      </div>
    </section>
  )
}

function getWeekIndexInMonth(dateKey: string) {
  const day = Number(dateKey.slice(8, 10))
  if (!Number.isFinite(day) || day <= 0) return 0
  return Math.min(4, Math.floor((day - 1) / 7))
}

function toMonthKeyFromDateKey(dateKey: string) {
  return dateKey.slice(0, 7)
}

function percentageDiff(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 200
  return ((current - previous) / previous) * 100
}

function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function formatMoney(value: number) {
  return `$ ${Math.round(value).toLocaleString("es-AR")}`
}

function getNowArgentina() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const [year, month, day] = formatter.format(new Date()).split("-").map(Number)
  return new Date(year, month - 1, day)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function clampMonth(date: Date, min: Date, max: Date) {
  const value = toMonthKey(date)
  if (value < toMonthKey(min)) return min
  if (value > toMonthKey(max)) return max
  return date
}

function buildMonthOptions(min: Date, max: Date) {
  const options: Array<{ value: string; label: string }> = []
  let cursor = new Date(min.getFullYear(), min.getMonth(), 1)

  while (toMonthKey(cursor) <= toMonthKey(max)) {
    options.push({ value: toMonthKey(cursor), label: monthLabel(cursor) })
    cursor = addMonths(cursor, 1)
  }

  return options
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function fromMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number)
  return new Date(year, month - 1, 1)
}

function monthLabel(date: Date) {
  const value = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date)
  return value.charAt(0).toUpperCase() + value.slice(1)
}
