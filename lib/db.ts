// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — Database Connection (PostgreSQL)
// Uses pg Pool singleton per process.
// ─────────────────────────────────────────────────────────────────
import { Pool, PoolClient, QueryResultRow } from 'pg';

declare global {
  // Preserve pool across Next.js hot-reloads in dev
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }

  return new Pool({
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME     ?? 'steamhives_rms',
    user:     process.env.DB_USER     ?? 'postgres',
    password: process.env.DB_PASS     ?? '',
    max: 10,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}

export function getPool(): Pool {
  if (process.env.NODE_ENV === 'development') {
    if (!global.__pgPool) global.__pgPool = createPool();
    return global.__pgPool;
  }
  return (createPool as unknown as { _pool?: Pool })._pool
    ?? ((createPool as unknown as { _pool?: Pool })._pool = createPool());
}

// ── Placeholder conversion: ? → $1, $2, ... ──────────────────────
function toPositional(sql: string): string {
  let i = 0;
  // Replace ? that are NOT inside $N patterns already
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── Fix mixed $N (already positional) — if sql already uses $1 don't re-number ──
function normalise(sql: string): string {
  // If the sql already has positional params like $1, $2 — don't double-convert
  if (/\$[0-9]/.test(sql)) return sql;
  return toPositional(sql);
}

// ── Convenience query helper ──────────────────────────────────────
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const pool = getPool();
  const { rows } = await pool.query<QueryResultRow>(normalise(sql), params);
  return rows as T;
}

// ── Single-row helper ─────────────────────────────────────────────
export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] ?? null;
}

// ── Execute (INSERT / UPDATE / DELETE) — returns id via RETURNING ──
export interface ExecResult {
  rowCount: number;
  insertId?: number;
}

export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<ExecResult> {
  const pool = getPool();
  // Auto-append RETURNING id for INSERTs so insertId works like MySQL
  const normalized = normalise(sql);
  const isInsert = normalized.trim().toUpperCase().startsWith('INSERT');
  const finalSql = isInsert && !normalized.toUpperCase().includes('RETURNING')
    ? normalized + ' RETURNING id'
    : normalized;

  const result = await pool.query(finalSql, params);
  return {
    rowCount: result.rowCount ?? 0,
    insertId: result.rows?.[0]?.id ?? undefined,
  };
}

// ── Transaction helper ────────────────────────────────────────────
export async function withTransaction<T>(
  fn: (conn: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const conn = await pool.connect();
  await conn.query('BEGIN');
  try {
    const result = await fn(conn);
    await conn.query('COMMIT');
    return result;
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

export default getPool;
