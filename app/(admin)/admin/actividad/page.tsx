"use client"

import { useMemo } from "react"
import { Activity, Clock3, UserRound } from "lucide-react"
import AdminActivityFeed from "@/components/admin/AdminActivityFeed"
import DashboardCards from "@/components/admin/DashboardCards"
import { useAdminActivity } from "@/hooks/useAdminActivity"

export default function ActividadPage() {
  const { entries, loading, error } = useAdminActivity(40)

  const summaryCards = useMemo(() => {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const sevenDaysMs = 7 * oneDayMs

    const actionsToday = entries.filter((entry) => now - new Date(entry.createdAt).getTime() <= oneDayMs).length
    const actionsThisWeek = entries.filter((entry) => now - new Date(entry.createdAt).getTime() <= sevenDaysMs).length
    const uniqueActors = new Set(entries.map((entry) => entry.actorEmail)).size

    return [
      {
        id: "activity-total",
        title: "Registros cargados",
        value: String(entries.length),
        subtitle: "ultimas acciones",
        icon: <Activity size={16} />,
      },
      {
        id: "activity-today",
        title: "Ultimas 24h",
        value: String(actionsToday),
        subtitle: "acciones recientes",
        icon: <Clock3 size={16} />,
      },
      {
        id: "activity-actors",
        title: "Admins activos",
        value: String(uniqueActors),
        subtitle: `${actionsThisWeek} acciones en 7 dias`,
        icon: <UserRound size={16} />,
      },
    ]
  }, [entries])

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">Control</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Actividad administrativa</h1>
        <p className="mt-1 text-sm text-muted">
          Segui cambios clave del panel, movimientos sobre turnos y ajustes operativos.
        </p>
      </header>

      <DashboardCards cards={summaryCards} />

      <div className="mt-6">
        <AdminActivityFeed
          entries={entries}
          loading={loading}
          error={error}
          showHeader={false}
          emptyMessage="Todavia no hay movimientos administrativos registrados."
        />
      </div>
    </section>
  )
}
