import { getDashboardMetrics } from "../services/dashboard.service.js";

export async function getDashboardMetricsController(_req, res) {
  const metrics = await getDashboardMetrics();
  res.json({
    ok: true,
    data: metrics,
  });
}
