import app from "./app.js";
import { healthcheck, pool } from "./config/db.js";

const port = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  await healthcheck();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error starting backend", error);
  void pool.end();
  process.exit(1);
});
