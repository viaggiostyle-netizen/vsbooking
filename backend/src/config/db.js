import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no configurada");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_MAX_POOL ?? 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS ?? 5000),
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(task) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await task(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function healthcheck() {
  await query("select 1");
}
