// GET /api/admin/audit  — fetch audit log (dev only)
// Query params: ?school_id=&limit=200&offset=0
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { authDev, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await authDev();
    const sp       = req.nextUrl.searchParams;
    const schoolId = sp.get('school_id');
    const limit    = Math.min(500, parseInt(sp.get('limit') ?? '200', 10));
    const offset   = parseInt(sp.get('offset') ?? '0', 10);

    const params: unknown[] = [limit, offset];
    const whereClause = schoolId ? `WHERE school_id = $3` : '';
    if (schoolId) params.push(schoolId);

    const logs = await query(
      `SELECT id, school_id, action, details, ip, created_at
       FROM sh_audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    return ok({ logs });
  } catch (e) {
    if (e instanceof AuthError) return err((e as AuthError).message, (e as AuthError).status);
    return err('Could not load audit log.', 500);
  }
}
