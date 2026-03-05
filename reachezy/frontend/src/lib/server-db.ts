/**
 * Server-side only DB connection for Next.js API routes.
 * Connects to the same RDS instance used by Lambdas.
 * Reads credentials from env vars (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD).
 *
 * Pool tuning:
 *  - idleTimeoutMillis: 30 s — kills idle connections before RDS (5 min) does
 *  - keepAlive: true / 10 s — sends TCP keepalives so the socket stays alive
 *  - connectionTimeoutMillis: 10 s — longer timeout for first connection
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.NEXT_PUBLIC_DB_HOST,
    database: process.env.NEXT_PUBLIC_DB_NAME || 'reachezy',
    user: process.env.NEXT_PUBLIC_DB_USER || 'postgres',
    password: process.env.NEXT_PUBLIC_DB_PASSWORD || '',
    port: 5432,
    max: 3,                          // keep footprint small for local dev → RDS
    idleTimeoutMillis: 20_000,       // evict idle clients before RDS (5 min) does
    connectionTimeoutMillis: 5_000,  // fail fast so the retry fires sooner
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,  // start TCP keepalives immediately (no grace period)
    ssl: { rejectUnauthorized: false },
  });

  // Log unexpected pool errors so they appear in Next.js dev output
  pool.on('error', (err) => {
    console.error('[pg pool] unexpected error on idle client:', err.message);
    // Destroy the pool so getPool() re-creates it on the next request
    pool = null;
  });

  return pool;
}

/**
 * Run a parameterised query, retrying up to 3 times on connection failures.
 * Necessary because local-dev → remote RDS connections are occasionally dropped
 * by intermediate NAT gateways.
 */
export async function query(text: string, params?: unknown[]) {
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await getPool().query(text, params);
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isConnErr =
        msg.includes('Connection terminated') ||
        msg.includes('connection timeout') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ECONNREFUSED');

      if (isConnErr && attempt < MAX_ATTEMPTS) {
        console.warn(`[pg pool] Connection error on attempt ${attempt}/${MAX_ATTEMPTS}, resetting pool and retrying…`);
        pool = null;
        // Brief pause before retry to let the OS flush the dead socket
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }

      throw err;
    }
  }

  throw lastErr;
}
