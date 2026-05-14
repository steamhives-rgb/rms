// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — Complete Auth Module
// Supports:
//   • School sessions (DB)
//   • Teacher sessions (DB)
//   • Stateless Dev sessions (HMAC cookie)
//   • Polymorphic auth resolution
// ─────────────────────────────────────────────────────────────────
 
import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
 
import { queryOne, execute } from './db';
import { SESSION_TTL, LOG_ENABLED } from './constants';
 
import type {
  SessionPayload,
  School,
  Teacher,
} from './types';
 
// ══════════════════════════════════════════════════════════════════
// Auth Error
// ══════════════════════════════════════════════════════════════════
 
export class AuthError extends Error {
  constructor(
    public message: string,
    public status = 401
  ) {
    super(message);
  }
}
 
// ══════════════════════════════════════════════════════════════════
// Base Auth
// ══════════════════════════════════════════════════════════════════
 
export abstract class BaseAuth {
  abstract readonly role:
    | 'school'
    | 'teacher'
    | 'dev';
 
  abstract readonly schoolId: string;
 
  abstract readonly session: SessionPayload;
 
  get isDev(): boolean {
    return this.role === 'dev';
  }
 
  get isTeacher(): boolean {
    return this.role === 'teacher';
  }
 
  get isSchoolAdmin(): boolean {
    return this.role === 'school';
  }
 
  assertDev(): void {
    if (!this.isDev) {
      throw new AuthError(
        'Developer access required',
        403
      );
    }
  }
 
  assertTeacher(): void {
    if (!this.isTeacher) {
      throw new AuthError(
        'Teacher authentication required',
        403
      );
    }
  }
}
 
// ══════════════════════════════════════════════════════════════════
// School Admin Auth
// ══════════════════════════════════════════════════════════════════
 
export class SchoolAdminAuth extends BaseAuth {
  readonly role = 'school' as const;
 
  constructor(
    readonly session: SessionPayload
  ) {
    super();
  }
 
  get schoolId(): string {
    return this.session.school_id;
  }
}
 
/**
 * authSchoolAdmin — like authSchool but rejects teacher sessions.
 * Use this on every admin-only route to prevent teachers accessing admin data.
 */
export async function authSchoolAdmin(): Promise<SessionPayload> {
  const sess = await authSchool();
  if (sess.teacher_id) {
    throw new AuthError('Admin access required.', 403);
  }
  return sess;
}
 
// ══════════════════════════════════════════════════════════════════
// Teacher Auth
// ══════════════════════════════════════════════════════════════════
 
export class TeacherAuth extends BaseAuth {
  readonly role = 'teacher' as const;
 
  constructor(
    readonly session: SessionPayload,
    readonly teacher: Teacher
  ) {
    super();
  }
 
  get schoolId(): string {
    return this.session.school_id;
  }
}
 
// ══════════════════════════════════════════════════════════════════
// Dev Auth
// ══════════════════════════════════════════════════════════════════
 
export class DevAuth extends BaseAuth {
  readonly role = 'dev' as const;
 
  constructor(
    readonly session: SessionPayload
  ) {
    super();
  }
 
  get schoolId(): string {
    return '__DEV__';
  }
}
 
// ══════════════════════════════════════════════════════════════════
// Token Extraction
// ══════════════════════════════════════════════════════════════════
 
export async function getToken(): Promise<string | null> {
  try {
    const headersList = await headers();
 
    const fromHeader =
      headersList.get('x-session-token');
 
    if (fromHeader) {
      return fromHeader;
    }
  } catch {}
 
  try {
    const cookieStore = await cookies();
 
    const dbToken =
      cookieStore.get('rms_token')?.value;
 
    if (dbToken) {
      return dbToken;
    }
 
    const devToken =
      cookieStore.get('rms_dev_token')?.value;
 
    if (devToken) {
      return devToken;
    }
  } catch {}
 
  return null;
}
 
// ══════════════════════════════════════════════════════════════════
// Session Creation
// ══════════════════════════════════════════════════════════════════
 
export async function createSession(
  schoolId: string,
  isDev = false,
  teacherId: number | null = null
): Promise<string> {
  const token = crypto
    .randomBytes(32)
    .toString('hex');
 
  const expiresAt = new Date(
    Date.now() + SESSION_TTL * 1000
  ).toISOString();
 
  await execute(
    `
      INSERT INTO sh_sessions (
        token,
        school_id,
        is_dev,
        teacher_id,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      token,
      schoolId,
      isDev,
      teacherId,
      expiresAt,
    ]
  );
 
  return token;
}
 
// ══════════════════════════════════════════════════════════════════
// Session Lookup
// ══════════════════════════════════════════════════════════════════
 
export async function getSession(
  token: string
): Promise<SessionPayload | null> {
  return queryOne<SessionPayload>(
    `
      SELECT
        school_id,
        is_dev,
        teacher_id,
        expires_at
      FROM sh_sessions
      WHERE token = ?
      AND expires_at > NOW()
    `,
    [token]
  );
}
 
// ══════════════════════════════════════════════════════════════════
// School Auth
// ══════════════════════════════════════════════════════════════════
 
export async function authSchool(): Promise<SessionPayload> {
  const token = await getToken();
 
  if (!token) {
    throw new AuthError(
      'Not authenticated',
      401
    );
  }
 
  const sess = await getSession(token);
 
  if (!sess) {
    throw new AuthError(
      'Session expired. Please login again.',
      401
    );
  }
 
  return sess;
}
 
// ══════════════════════════════════════════════════════════════════
// Teacher Auth
// ══════════════════════════════════════════════════════════════════
 
export async function authTeacher(): Promise<
  SessionPayload & { teacher: Teacher }
> {
  const sess = await authSchool();
 
  if (!sess.teacher_id) {
    throw new AuthError(
      'Teacher authentication required',
      403
    );
  }
 
  const teacher = await queryOne<Teacher>(
    `
      SELECT *
      FROM sh_teachers
      WHERE id = ?
      AND school_id = ?
    `,
    [sess.teacher_id, sess.school_id]
  );
 
  if (!teacher) {
    throw new AuthError(
      'Teacher account not found',
      403
    );
  }
 
  teacher.subjects =
    parseJsonField<string[]>(
      teacher.subjects as unknown as string
    ) ?? [];
 
  teacher.admin_tasks =
    parseJsonField<string[]>(
      teacher.admin_tasks as unknown as string
    ) ?? [];
 
  teacher.classes =
    parseJsonField<string[]>(
      teacher.classes as unknown as string
    ) ?? [];
 
  return {
    ...sess,
    teacher,
  };
}
 
// ══════════════════════════════════════════════════════════════════
// Dev Auth
// ══════════════════════════════════════════════════════════════════
 
export async function authDev(): Promise<SessionPayload> {
  try {
    const cookieStore = await cookies();
 
    const devToken =
      cookieStore.get('rms_dev_token')?.value;
 
    const devKey = getDevKey();
 
    if (
      devToken &&
      devKey &&
      verifyDevToken(devToken, devKey)
    ) {
      return {
        school_id: '__DEV__',
        is_dev: true,
        teacher_id: null,
        expires_at: '',
      } as SessionPayload;
    }
  } catch {}
 
  const sess = await authSchool();
 
  if (!sess.is_dev) {
    throw new AuthError(
      'Developer access required',
      403
    );
  }
 
  return sess;
}
 
// ══════════════════════════════════════════════════════════════════
// Resolve Auth
// ══════════════════════════════════════════════════════════════════
 
export async function resolveAuth(): Promise<
  DevAuth | TeacherAuth | SchoolAdminAuth
> {
  const token = await getToken();
 
  if (!token) {
    throw new AuthError(
      'Not authenticated',
      401
    );
  }
 
  // Try stateless dev auth first
  try {
    const devKey = getDevKey();
 
    if (
      token &&
      devKey &&
      verifyDevToken(token, devKey)
    ) {
      return new DevAuth({
        school_id: '__DEV__',
        is_dev: true,
        teacher_id: null,
        expires_at: '',
      } as SessionPayload);
    }
  } catch {}
 
  const sess = await getSession(token);
 
  if (!sess) {
    throw new AuthError(
      'Session expired',
      401
    );
  }
 
  if (sess.is_dev) {
    return new DevAuth(sess);
  }
 
  if (sess.teacher_id) {
    const teacher = await queryOne<Teacher>(
      `
        SELECT *
        FROM sh_teachers
        WHERE id = ?
        AND school_id = ?
      `,
      [sess.teacher_id, sess.school_id]
    );
 
    if (teacher) {
      teacher.subjects =
        parseJsonField<string[]>(
          teacher.subjects as unknown as string
        ) ?? [];
 
      teacher.admin_tasks =
        parseJsonField<string[]>(
          teacher.admin_tasks as unknown as string
        ) ?? [];
 
      teacher.classes =
        parseJsonField<string[]>(
          teacher.classes as unknown as string
        ) ?? [];
 
      return new TeacherAuth(
        sess,
        teacher
      );
    }
  }
 
  return new SchoolAdminAuth(sess);
}
 
// ══════════════════════════════════════════════════════════════════
// Auth Check
// ══════════════════════════════════════════════════════════════════
 
export async function authCheckFull(): Promise<{
  school: School | null;
  is_dev: boolean;
  teacher?: Teacher;
  is_teacher?: boolean;
}> {
  const auth = await resolveAuth();
 
  if (auth.isDev) {
    return {
      school: null,
      is_dev: true,
    };
  }
 
  const school = await queryOne<School>(
    `
      SELECT *
      FROM sh_schools
      WHERE id = ?
    `,
    [auth.schoolId]
  );
 
  if (!school) {
    throw new AuthError(
      'School not found',
      404
    );
  }
 
  const result: {
    school: School | null;
    is_dev: boolean;
    teacher?: Teacher;
    is_teacher?: boolean;
  } = {
    school,
    is_dev: false,
  };
 
  if (auth instanceof TeacherAuth) {
    result.teacher = auth.teacher;
    result.is_teacher = true;
  }
 
  return result;
}
 
// ══════════════════════════════════════════════════════════════════
// Dev Token Helpers
// ══════════════════════════════════════════════════════════════════
 
export function getDevKey(): string {
  return (
    process.env.DEV_KEY_HASH ||
    process.env.DEV_KEY ||
    ''
  ).trim();
}
 
export function signDevToken(
  secret: string
): string {
  const expiry =
    Date.now() + 8 * 60 * 60 * 1000;
 
  const payload = `__DEV__:${expiry}`;
 
  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
 
  return Buffer.from(
    `${payload}:${sig}`
  ).toString('base64url');
}
 
export function verifyDevToken(
  token: string,
  secret: string
): boolean {
  try {
    const decoded = Buffer.from(
      token,
      'base64url'
    ).toString();
 
    const lastColon =
      decoded.lastIndexOf(':');
 
    if (lastColon === -1) {
      return false;
    }
 
    const payload = decoded.substring(
      0,
      lastColon
    );
 
    const sig = decoded.substring(
      lastColon + 1
    );
 
    const parts = payload.split(':');
 
    if (parts.length !== 2) {
      return false;
    }
 
    const expiry = Number(parts[1]);
 
    if (!expiry) {
      return false;
    }
 
    if (Date.now() > expiry) {
      return false;
    }
 
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
 
    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
 
// ══════════════════════════════════════════════════════════════════
// Password Helpers
// ══════════════════════════════════════════════════════════════════
 
export async function hashPassword(
  plain: string
): Promise<string> {
  return bcrypt.hash(plain, 12);
}
 
export async function hashPasswordFast(
  plain: string
): Promise<string> {
  return bcrypt.hash(plain, 10);
}
 
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
 
export function generateTeacherPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
 
  const bytes =
    crypto.randomBytes(10);
 
  let password = '';
 
  for (let i = 0; i < 10; i++) {
    password +=
      chars[bytes[i] % chars.length];
  }
 
  return password;
}
 
// ══════════════════════════════════════════════════════════════════
// Logging
// ══════════════════════════════════════════════════════════════════
 
export async function rmsLog(
  action: string,
  details = '',
  schoolId: string | null = null
): Promise<void> {
  if (!LOG_ENABLED) {
    return;
  }
 
  try {
    await execute(
      `
        INSERT INTO sh_audit_log (
          school_id,
          action,
          details,
          ip
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        schoolId,
        action,
        details,
        '0.0.0.0',
      ]
    );
  } catch {}
}
 
// ══════════════════════════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════════════════════════
 
export function parseJsonField<T>(
  raw: string | null | undefined
): T | null {
  if (!raw) {
    return null;
  }
 
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}