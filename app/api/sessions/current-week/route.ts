// PATCH /api/sessions/current-week — update current_week on the active session
// Body: { week: number }
import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function PATCH(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();
    const week = body.week;

    if (typeof week !== 'number' || !Number.isInteger(week) || week < 1) {
      return err('week must be a positive integer.');
    }

    // Validate against attendance_weeks cap
    const active = await queryOne<{ attendance_weeks: number }>(
      'SELECT attendance_weeks FROM sh_acad_sessions WHERE school_id=? AND is_current=TRUE LIMIT 1',
      [sid]
    );
    if (!active) return err('No active session found.', 404);

    if (week > active.attendance_weeks) {
      return err(`Week ${week} exceeds the configured ${active.attendance_weeks}-week term.`);
    }

    await execute(
      'UPDATE sh_acad_sessions SET current_week=? WHERE school_id=? AND is_current=TRUE',
      [week, sid]
    );

    await rmsLog('SET_CURRENT_WEEK', `Week: ${week}`, sid);
    return ok({ current_week: week, message: `Current week set to Week ${week}.` });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not update current week.', 500);
  }
}
