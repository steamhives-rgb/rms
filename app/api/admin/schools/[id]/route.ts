// DELETE /api/admin/schools/[id]  — delete a specific school (dev only)
import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { authDev, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authDev();
    const schoolId = params.id;
    if (!schoolId) return err('School ID required.');

    // Delete in dependency order
    const tables = [
      'sh_results',
      'sh_students',
      'sh_attendance',
      'sh_teachers',
      'sh_auth',
      'sh_sessions',
      'sh_acad_sessions',
      'sh_subjects',
      'sh_audit_log',
      'sh_password_resets',
      'sh_schools',
    ];

    for (const table of tables) {
      await execute(`DELETE FROM ${table} WHERE school_id = $1`, [schoolId]).catch(() => {
        // Some tables may not have school_id — skip silently
      });
    }

    await rmsLog('DEV_DELETE_SCHOOL', `Deleted school: ${schoolId}`, null);
    return ok({ message: `School ${schoolId} deleted.` });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error('[admin/schools/delete]', e);
    return err('Could not delete school.', 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authDev();
    const { query: dbQuery } = await import('@/lib/db');
    const rows = await dbQuery(
      `SELECT id, name, abbreviation, plan_label, student_limit, created_at
       FROM sh_schools WHERE id = $1`,
      [params.id]
    );
    const school = (rows as unknown[])[0] ?? null;
    if (!school) return err('School not found.', 404);
    return ok({ school });
  } catch (e) {
    if (e instanceof AuthError) return err((e as AuthError).message, (e as AuthError).status);
    return err('Could not fetch school.', 500);
  }
}
