// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — Shared Utilities
// ─────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GRADE_SCALE, COUPON_CHARS, PIN_CHARS } from './constants';
import { query, queryOne } from './db';
import type { PoolClient } from 'pg';

// ── Tailwind class merge ──────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Grade helpers ─────────────────────────────────────────────────
export function grade(score: number): string {
  for (const g of GRADE_SCALE) {
    if (score >= g.min) return g.grade;
  }
  return 'F9';
}

export function gradeRemark(score: number): string {
  for (const g of GRADE_SCALE) {
    if (score >= g.min) return g.remark;
  }
  return 'Fail';
}

// ── Admission number generator ────────────────────────────────────
export function compressClassCode(cls: string): string {
  if (!cls) return 'CLS';
  const numMatch = cls.match(/(\d+)$/);
  const num = numMatch ? numMatch[1] : '';
  const letters = cls.replace(/[^a-zA-Z]/g, '');
  const firstTwo = letters.substring(0, 2).toUpperCase();
  return firstTwo + num;
}

// Helper: convert ? to $N for raw PoolClient queries
function toPositional(sql: string, offset = 0): string {
  let i = offset;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function generateAdmission(
  schoolId: string,
  cls: string,
  session: string,
  conn?: PoolClient
): Promise<string> {
  let ab: string;
  if (conn) {
    const { rows } = await conn.query<{ abbreviation: string }>(
      'SELECT abbreviation FROM sh_schools WHERE id=$1',
      [schoolId]
    );
    if (!rows[0]) throw new Error('School not found');
    ab = rows[0].abbreviation.toUpperCase();
  } else {
    const row = await queryOne<{ abbreviation: string }>(
      'SELECT abbreviation FROM sh_schools WHERE id=?',
      [schoolId]
    );
    if (!row) throw new Error('School not found');
    ab = row.abbreviation.toUpperCase();
  }

  const parts = session.split('/');
  const yr = (parts[0] ?? session).trim().slice(-2);
  const cl = compressClassCode(cls);
  const pattern = `${ab}/${cl}/${yr}/`;
  const safeLike = pattern.replace(/%/g, '\\%').replace(/_/g, '\\_') + '%';

  let maxserial = 0;
  if (conn) {
    const { rows } = await conn.query<{ maxserial: number | null }>(
      `SELECT MAX(CAST(SUBSTRING(adm FROM '[0-9]+$') AS INTEGER)) AS maxserial
       FROM sh_students WHERE school_id=$1 AND adm LIKE $2`,
      [schoolId, safeLike]
    );
    maxserial = rows[0]?.maxserial ?? 0;
  } else {
    const rows = await query<{ maxserial: number | null }[]>(
      `SELECT MAX(CAST(SUBSTRING(adm FROM '[0-9]+$') AS INTEGER)) AS maxserial
       FROM sh_students WHERE school_id=? AND adm LIKE ?`,
      [schoolId, safeLike]
    );
    maxserial = rows[0]?.maxserial ?? 0;
  }

  const serial = (maxserial ?? 0) + 1;
  return `${ab}/${cl}/${yr}/${String(serial).padStart(3, '0')}`;
}

// ── School ID generator ───────────────────────────────────────────
export async function generateSchoolId(abbr: string): Promise<string> {
  const ab = abbr.toUpperCase().substring(0, 3);
  let id: string;
  do {
    const n = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    id = `${ab}${n}`;
    const rows = await query<{ cnt: string }[]>(
      'SELECT COUNT(*) as cnt FROM sh_schools WHERE id=?',
      [id]
    );
    if (parseInt(rows[0]?.cnt ?? '0', 10) === 0) break;
  // eslint-disable-next-line no-constant-condition
  } while (true);
  return id;
}

// ── Coupon code generator ─────────────────────────────────────────
export async function generateCouponCode(): Promise<string> {
  let code: string;
  do {
    const bytes = crypto.randomBytes(9);
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 3; i++) part1 += COUPON_CHARS[bytes[i] % COUPON_CHARS.length];
    for (let i = 3; i < 9; i++) part2 += COUPON_CHARS[bytes[i] % COUPON_CHARS.length];
    code = `${part1}-${part2}`;
    const rows = await query<{ cnt: string }[]>(
      'SELECT COUNT(*) as cnt FROM sh_coupons WHERE code=?',
      [code]
    );
    if (parseInt(rows[0]?.cnt ?? '0', 10) === 0) break;
  // eslint-disable-next-line no-constant-condition
  } while (true);
  return code;
}

// ── PIN generator ─────────────────────────────────────────────────
export async function generatePin(): Promise<string> {
  let pin: string;
  do {
    const bytes = crypto.randomBytes(7);
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 3; i++) part1 += PIN_CHARS[bytes[i] % PIN_CHARS.length];
    for (let i = 3; i < 7; i++) part2 += PIN_CHARS[bytes[i] % PIN_CHARS.length];
    pin = `PIN-${part1}-${part2}`;
    const rows = await query<{ cnt: string }[]>(
      'SELECT COUNT(*) as cnt FROM sh_pins WHERE pin=?',
      [pin]
    );
    if (parseInt(rows[0]?.cnt ?? '0', 10) === 0) break;
  // eslint-disable-next-line no-constant-condition
  } while (true);
  return pin;
}

// ── Employee ID auto-generator ────────────────────────────────────
export async function nextEmployeeId(schoolId: string): Promise<string> {
  // Fetch school abbreviation
  const school = await queryOne<{ abbreviation: string }>(
    'SELECT abbreviation FROM sh_schools WHERE id=?',
    [schoolId]
  );
  const abbr = school?.abbreviation ?? 'SCH';

  // Find highest existing TCH number for this school (format: ABBR/TCHNN)
  const rows = await query<{ employee_id: string }[]>(
    `SELECT employee_id FROM sh_teachers
     WHERE school_id=? AND employee_id ~ '^[A-Z]+/TCH[0-9]+$'
     ORDER BY CAST(SUBSTRING(employee_id FROM POSITION('/TCH' IN employee_id) + 4) AS INTEGER) DESC LIMIT 1`,
    [schoolId]
  );
  const last = rows[0]?.employee_id;
  const lastNum = last ? parseInt(last.split('/TCH')[1] ?? '0', 10) : 0;
  const next = lastNum + 1;
  return `${abbr}/TCH${String(next).padStart(2, '0')}`;
}

// ── JSON field helpers ────────────────────────────────────────────
export function parseJsonField<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw !== 'string') return raw as T;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function toJsonField(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

// ── Date helpers ──────────────────────────────────────────────────
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function toMysqlDatetime(date: Date): string {
  return date.toISOString();
}

// ── API response helpers ──────────────────────────────────────────
export function ok<T>(data: T, status = 200): Response {
  return Response.json({ success: true, ...data }, { status });
}

export function err(message: string, status = 400): Response {
  return Response.json({ success: false, error: message }, { status });
}

// Suppress unused import warning — used by some SQL helper paths
void (toPositional);
