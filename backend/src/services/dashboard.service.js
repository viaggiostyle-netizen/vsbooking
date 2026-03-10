import { query } from "../config/db.js";
import { APPOINTMENT_STATUS } from "../constants/appointment-status.js";
import {
  getDateContext,
  monthBoundaries,
  parseCount,
  percentageChange,
  pickNextAppointment,
} from "../utils/metrics.service.js";

export async function getDashboardMetrics(referenceDate = new Date()) {
  const { today, currentTime } = getDateContext(referenceDate);
  const months = monthBoundaries(referenceDate);

  const [appointmentsTodayResult, totalsResult, clientsResult, revenueTotalResult, peakHourResult] =
    await Promise.all([
      query(
        `
          select
            a.id,
            a.date,
            to_char(a.time, 'HH24:MI:SS') as time,
            a.status,
            a.price_snapshot,
            c.id as client_id,
            c.name as client_name,
            s.id as service_id,
            s.name as service_name,
            s.duration as service_duration
          from appointments a
          join clients c on c.id = a.client_id
          join services s on s.id = a.service_id
          where a.date = $1
          order by a.time asc
        `,
        [today]
      ),
      query(
        `
          select
            count(*) filter (where status = $1) as completados,
            count(*) filter (where status = $2) as no_show,
            count(*) filter (where status = $3) as no_vino_aviso,
            count(*) filter (where status = $4) as cancelados
          from appointments
        `,
        [
          APPOINTMENT_STATUS.COMPLETADO,
          APPOINTMENT_STATUS.NO_SHOW,
          APPOINTMENT_STATUS.NO_VINO_AVISO,
          APPOINTMENT_STATUS.CANCELADO,
        ]
      ),
      query(
        `
          select
            count(*) as clientes_totales,
            count(*) filter (where is_recurrent = true) as clientes_recurrentes
          from clients
        `
      ),
      query(`select coalesce(sum(amount), 0) as facturacion_total from revenue_logs`),
      query(
        `
          select to_char(time, 'HH24:MI:SS') as time, count(*)::int as total
          from appointments
          where status = $1
          group by time
          order by total desc, time asc
          limit 1
        `,
        [APPOINTMENT_STATUS.COMPLETADO]
      ),
    ]);

  const [overduePendingResult, upcomingPendingResult] = await Promise.all([
    query(
      `
        select
          a.id,
          a.date,
          to_char(a.time, 'HH24:MI:SS') as time,
          a.status,
          a.price_snapshot,
          c.name as client_name,
          s.name as service_name
        from appointments a
        join clients c on c.id = a.client_id
        join services s on s.id = a.service_id
        where a.status = $1
          and a.date = $2
          and a.time < $3::time
        order by a.time asc
        limit 1
      `,
      [APPOINTMENT_STATUS.PENDIENTE, today, currentTime]
    ),
    query(
      `
        select
          a.id,
          a.date,
          to_char(a.time, 'HH24:MI:SS') as time,
          a.status,
          a.price_snapshot,
          c.name as client_name,
          s.name as service_name
        from appointments a
        join clients c on c.id = a.client_id
        join services s on s.id = a.service_id
        where a.status = $1
          and (
            a.date > $2
            or (a.date = $2 and a.time >= $3::time)
          )
        order by a.date asc, a.time asc
        limit 1
      `,
      [APPOINTMENT_STATUS.PENDIENTE, today, currentTime]
    ),
  ]);

  const [monthlyCompletedResult, monthlyRevenueResult, revenueSeriesResult] = await Promise.all([
    query(
      `
        select
          count(*) filter (where status = $1 and updated_at between $2 and $3) as completados_mes_actual,
          count(*) filter (where status = $1 and updated_at between $4 and $5) as completados_mes_anterior,
          count(*) filter (where status = $6 and updated_at between $2 and $3) as no_show_mes_actual,
          count(*) filter (where status = $6 and updated_at between $4 and $5) as no_show_mes_anterior
        from appointments
      `,
      [
        APPOINTMENT_STATUS.COMPLETADO,
        months.currentStart,
        months.currentEnd,
        months.previousStart,
        months.previousEnd,
        APPOINTMENT_STATUS.NO_SHOW,
      ]
    ),
    query(
      `
        select
          coalesce(sum(amount) filter (where date between $1 and $2), 0) as ingresos_mes_actual,
          coalesce(sum(amount) filter (where date between $3 and $4), 0) as ingresos_mes_anterior
        from revenue_logs
      `,
      [months.currentStart, months.currentEnd, months.previousStart, months.previousEnd]
    ),
    query(
      `
        select
          to_char(date::date, 'YYYY-MM-DD') as day,
          coalesce(sum(amount), 0) as amount
        from revenue_logs
        where date between $1 and $2
        group by day
        order by day asc
      `,
      [months.currentStart, months.currentEnd]
    ),
  ]);

  const appointmentsToday = appointmentsTodayResult.rows;
  const turnosHoy = appointmentsToday.filter((item) => item.status !== APPOINTMENT_STATUS.CANCELADO);
  const turnosHoyPendientes = turnosHoy.filter((item) => item.status === APPOINTMENT_STATUS.PENDIENTE);
  const totalEstimadoHoy = turnosHoyPendientes.reduce(
    (acc, item) => acc + Number(item.price_snapshot ?? 0),
    0
  );

  const monthlyCompleted = monthlyCompletedResult.rows[0] ?? {};
  const monthlyRevenue = monthlyRevenueResult.rows[0] ?? {};

  const completadosMesActual = parseCount(monthlyCompleted, "completados_mes_actual");
  const completadosMesAnterior = parseCount(monthlyCompleted, "completados_mes_anterior");
  const noShowMesActual = parseCount(monthlyCompleted, "no_show_mes_actual");
  const noShowMesAnterior = parseCount(monthlyCompleted, "no_show_mes_anterior");
  const porcentajeVariacionCompletados = percentageChange(completadosMesActual, completadosMesAnterior);
  const porcentajeVariacionNoShow = percentageChange(noShowMesActual, noShowMesAnterior);

  const ingresosMesActual = Number(monthlyRevenue.ingresos_mes_actual ?? 0);
  const ingresosMesAnterior = Number(monthlyRevenue.ingresos_mes_anterior ?? 0);
  const porcentajeVariacionIngresos = percentageChange(ingresosMesActual, ingresosMesAnterior);

  const nextAppointment = pickNextAppointment({
    overduePending: overduePendingResult.rows[0] ?? null,
    upcomingPending: upcomingPendingResult.rows[0] ?? null,
  });

  const totals = totalsResult.rows[0] ?? {};
  const clients = clientsResult.rows[0] ?? {};

  return {
    referenceDate: today,
    dashboard: {
      turnosHoy: turnosHoy.length,
      turnosHoyPendientes: turnosHoyPendientes.length,
      totalEstimadoHoy,
      proximoTurno: nextAppointment,
      completados: parseCount(totals, "completados"),
      noShow: parseCount(totals, "no_show"),
      noVinoAviso: parseCount(totals, "no_vino_aviso"),
      cancelados: parseCount(totals, "cancelados"),
      clientesTotales: parseCount(clients, "clientes_totales"),
      clientesRecurrentes: parseCount(clients, "clientes_recurrentes"),
      facturacionTotal: Number(revenueTotalResult.rows[0]?.facturacion_total ?? 0),
      horaMayorDemanda: peakHourResult.rows[0] ?? null,
    },
    monthly: {
      completadosMesActual,
      completadosMesAnterior,
      porcentajeVariacionCompletados,
      noShowMesActual,
      noShowMesAnterior,
      porcentajeVariacionNoShow,
      ingresosMesActual,
      ingresosMesAnterior,
      porcentajeVariacionIngresos,
    },
    charts: {
      ingresosPorDia: revenueSeriesResult.rows.map((row) => ({
        day: row.day,
        amount: Number(row.amount ?? 0),
      })),
    },
    agenda: {
      turnosDelDia: appointmentsToday,
    },
  };
}
