// GET  /api/dev/schools         — all data for dev panel
// POST /api/dev/schools         — { action: 'impersonate', school_id }
// PATCH /api/dev/schools        — { school_id, new_password }
// DELETE /api/dev/schools       — { school_id }
import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { authDev, AuthError, rmsLog, hashPassword, createSession } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

// ── GET — load all dev panel data ────────────────────────────────
export async function GET() {
  try {
    await authDev();

    const [schools, coupons, logs] = await Promise.all([
      query('SELECT id,name,abbreviation,student_limit,plan_label,created_at FROM sh_schools ORDER BY created_at DESC'),
      query('SELECT * FROM sh_coupons ORDER BY created_at DESC'),
      query('SELECT * FROM sh_audit_log ORDER BY created_at DESC LIMIT 200'),
    ]);

    const studentCounts = await query<{ school_id: string; cnt: number }[]>(
      'SELECT school_id, COUNT(*) as cnt FROM sh_students GROUP BY school_id'
    );
    const resultCounts = await query<{ school_id: string; cnt: number }[]>(
      'SELECT school_id, COUNT(*) as cnt FROM sh_results GROUP BY school_id'
    );

    const scMap: Record<string, number> = {};
    for (const r of studentCounts) scMap[r.school_id] = Number(r.cnt);
    const rcMap: Record<string, number> = {};
    for (const r of resultCounts)  rcMap[r.school_id] = Number(r.cnt);

    return ok({ schools, coupons, logs, studentCounts: scMap, resultCounts: rcMap });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load dev data.', 500);
  }
}

// ── POST — impersonate a school ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await authDev();
    const body = await req.json();
    const { action, school_id } = body;

    if (action === 'impersonate') {
      if (!school_id) return err('school_id required.');
      const school = await queryOne<{ name: string }>('SELECT name FROM sh_schools WHERE id=?', [school_id]);
      if (!school) return err('School not found.', 404);

      const token = await createSession(school_id, false, null);
      await rmsLog('DEV_IMPERSONATE', `Impersonating school ${school_id}`, null);

      const response = ok({ token, message: `Session created for ${school.name}` });
      response.headers.set(
        'Set-Cookie',
        `rms_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 8}`
      );
      return response;
    }

    return err('Unknown action.', 400);
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Action failed.', 500);
  }
}

// ── PATCH — reset school password ────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    await authDev();
    const body = await req.json();
    const { school_id, new_password } = body;

    if (!school_id)    return err('school_id required.');
    if (!new_password || new_password.length < 6) return err('Password must be at least 6 characters.');

    const hash = await hashPassword(new_password);
    await execute('UPDATE sh_schools SET password_hash=? WHERE id=?', [hash, school_id]);
    await rmsLog('DEV_RESET_PASSWORD', `School: ${school_id}`, null);
    return ok({ message: 'Password reset successfully.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not reset password.', 500);
  }
}

// ── DELETE — delete a school ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    await authDev();
    const body = await req.json();
    const { school_id } = body;
    if (!school_id) return err('school_id required.');

    const school = await queryOne<{ name: string }>('SELECT name FROM sh_schools WHERE id=?', [school_id]);
    if (!school) return err('School not found.', 404);

    // Delete all school data in dependency order
    await execute('DELETE FROM sh_subject_assignments WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_subjects          WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_attendance        WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_pins              WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_results           WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_students          WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_auth              WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_sessions          WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_acad_sessions     WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_teachers          WHERE school_id=?', [school_id]);
    await execute('DELETE FROM sh_schools           WHERE id=?',        [school_id]);

    await rmsLog('DEV_DELETE_SCHOOL', `Deleted school ${school_id} (${school.name})`, null);
    return ok({ message: `School "${school.name}" deleted.` });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete school.', 500);
  }
}