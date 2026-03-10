import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import appointmentsRoutes from "./routes/appointments.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { errorHandler, notFoundHandler } from "./utils/errors.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/appointments", appointmentsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
