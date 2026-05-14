// GET | POST /api/sessions — academic sessions
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET() {
  try {
    const sess = await authSchoolAdmin();
    const sessions = await query(
      `SELECT id, label, start_year, end_year, is_current, current_term,
              current_week, attendance_weeks, days_opened,
              next_term_begins, resumption_date, created_at
       FROM sh_acad_sessions WHERE school_id=? ORDER BY start_year DESC`,
      [sess.school_id]
    );
    return ok({ sessions });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load sessions.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess  = await authSchoolAdmin();
    const sid   = sess.school_id;
    const body  = await req.json();
    const label = (body.label ?? '').trim();
    if (!label) return err('Session label required.');

    const parts = label.split('/');
    const sy = parseInt(parts[0] ?? new Date().getFullYear().toString(), 10);
    const ey = parseInt(parts[1] ?? String(sy + 1), 10);

    const isCurrent       = !!body.is_current;
    const daysOpened      = body.days_opened ? parseInt(body.days_opened, 10) : null;
    const nextTerm        = body.next_term_begins?.trim() || null;
    const resumptionDate  = body.resumption_date?.trim() || null;
    const attendanceWeeks = body.attendance_weeks ? parseInt(body.attendance_weeks, 10) : 14;

    if (isCurrent) {
      await execute('UPDATE sh_acad_sessions SET is_current=false WHERE school_id=?', [sid]);
    }

    const currentTerm = (body.current_term ?? '').trim() || null;

    // Upsert — include resumption_date and attendance_weeks
    await execute(
      `INSERT INTO sh_acad_sessions
         (school_id, label, start_year, end_year, is_current, current_term, days_opened, next_term_begins, resumption_date, attendance_weeks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (school_id, label)
       DO UPDATE SET
         is_current       = EXCLUDED.is_current,
         current_term     = EXCLUDED.current_term,
         days_opened      = EXCLUDED.days_opened,
         next_term_begins = EXCLUDED.next_term_begins,
         resumption_date  = EXCLUDED.resumption_date,
         attendance_weeks = EXCLUDED.attendance_weeks`,
      [sid, label, sy, ey, isCurrent, currentTerm, daysOpened, nextTerm, resumptionDate, attendanceWeeks]
    );

    await rmsLog('SAVE_SESSION', `Label: ${label}`, sid);
    return ok({ message: 'Session saved.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not save session.', 500);
  }
}


export async function PUT(req: NextRequest) {
  try {
    const sess  = await authSchoolAdmin();
    const sid   = sess.school_id;
    const sp    = req.nextUrl.searchParams;
    const id    = sp.get('id');
    if (!id) return err('Session id required.');

    const body = await req.json();

    if (body.is_current) {
      // Unset all, then set this one
      await execute('UPDATE sh_acad_sessions SET is_current=false WHERE school_id=?', [sid]);
      await execute('UPDATE sh_acad_sessions SET is_current=true WHERE id=? AND school_id=?', [id, sid]);
    }

    if (body.current_term) {
      await execute('UPDATE sh_acad_sessions SET current_term=? WHERE id=? AND school_id=?', [body.current_term, id, sid]);
    }

    if (body.days_opened !== undefined) {
      await execute('UPDATE sh_acad_sessions SET days_opened=? WHERE id=? AND school_id=?', [body.days_opened || null, id, sid]);
    }

    if (body.next_term_begins !== undefined) {
      await execute('UPDATE sh_acad_sessions SET next_term_begins=? WHERE id=? AND school_id=?', [body.next_term_begins || null, id, sid]);
    }

    if (body.resumption_date !== undefined) {
      await execute('UPDATE sh_acad_sessions SET resumption_date=? WHERE id=? AND school_id=?', [body.resumption_date || null, id, sid]).catch(() => {});
    }

    if (body.current_week !== undefined) {
      const week = parseInt(body.current_week, 10);
      if (!isNaN(week) && week >= 1) {
        await execute('UPDATE sh_acad_sessions SET current_week=? WHERE id=? AND school_id=?', [week, id, sid]);
      }
    }

    if (body.attendance_weeks !== undefined) {
      const weeks = parseInt(body.attendance_weeks, 10);
      if (!isNaN(weeks) && weeks >= 1) {
        await execute('UPDATE sh_acad_sessions SET attendance_weeks=? WHERE id=? AND school_id=?', [weeks, id, sid]);
      }
    }

    return ok({ message: 'Session updated.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not update session.', 500);
  }
}