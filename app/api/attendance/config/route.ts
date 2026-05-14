// GET /api/attendance/config?class=&term=&session=
// Returns: { weeks: [{week_label, week_number}], total_weeks }
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authSchool, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const sess = await authSchool();
    const sid  = sess.school_id;
    const sp   = req.nextUrl.searchParams;
    const cls     = sp.get('class') ?? '';
    const term    = sp.get('term')  ?? '';
    const session = sp.get('session') ?? '';

    // Get total_weeks from school settings (default_attendance_weeks column)
    const school = await queryOne<{ default_attendance_weeks: number }>(
      'SELECT default_attendance_weeks FROM sh_schools WHERE id=?',
      [sid]
    );
    const totalWeeks = school?.default_attendance_weeks ?? 14;

    // Get distinct weeks already created for this class/term/session
    let weeks: { week_label: string; week_number: number }[] = [];
    if (cls && term && session) {
      const rows = await query<{ week_label: string }[]>(
        `SELECT DISTINCT week_label FROM sh_attendance
         WHERE school_id=? AND class=? AND term=? AND session=?
         ORDER BY week_label`,
        [sid, cls, term, session]
      );
      weeks = rows.map((r, i) => ({ week_label: r.week_label, week_number: i + 1 }));
    }

    return ok({ weeks, total_weeks: totalWeeks });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load attendance config.', 500);
  }
}