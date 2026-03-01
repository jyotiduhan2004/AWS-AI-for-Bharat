/**
 * Server-side only DB connection for Next.js API routes.
 * Connects to the same RDS instance used by Lambdas.
 * Reads credentials from env vars (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD).
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

export async function getPool(): Promise<Pool> {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME || 'reachezy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    port: 5432,
    max: 5,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = await getPool();
  return p.query(text, params);
}
