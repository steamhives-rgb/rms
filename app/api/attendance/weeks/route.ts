// GET /api/attendance/weeks — generate week list from session's attendance_weeks count
// POST /api/attendance/weeks — add a new attendance week
import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
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

    // Fetch the active session to get attendance_weeks count + resumption_date
    const acadSession = await queryOne<{ attendance_weeks: number; resumption_date: string | null }>(
      'SELECT attendance_weeks, resumption_date FROM sh_acad_sessions WHERE school_id=? AND is_current=true LIMIT 1',
      [sid]
    );
    const totalWeeks = acadSession?.attendance_weeks ?? 14;

    // Determine which week numbers already have DB records
    const existingRows = await query<{ week_label: string }[]>(
      `SELECT DISTINCT week_label FROM sh_attendance
       WHERE school_id=? AND class=? AND term=? AND session=?`,
      [sid, cls, term, session]
    );
    const recordedSet = new Set(existingRows.map(r => r.week_label));

    // Calculate current week from resumption_date
    let currentWeekNum: number | null = null;
    if (acadSession?.resumption_date) {
      try {
        const start = new Date(
          acadSession.resumption_date.includes('T')
            ? acadSession.resumption_date
            : acadSession.resumption_date + 'T00:00:00'
        );
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        if (diffMs >= 0) {
          currentWeekNum = Math.min(Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1, totalWeeks);
        } else {
          currentWeekNum = 1;
        }
      } catch { /* ignore parse errors */ }
    }

    // Generate full week list 1..totalWeeks
    const weeks = Array.from({ length: totalWeeks }, (_, i) => {
      const num   = i + 1;
      const label = `Week ${num}`;
      const isCurrent = currentWeekNum === num;
      return {
        week_number:   num,
        week_label:    label,
        display_label: isCurrent ? `${label} (current)` : label,
        is_current:    isCurrent,
        has_records:   recordedSet.has(label),
      };
    });

    return ok({ weeks, total_weeks: totalWeeks, current_week: currentWeekNum });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load weeks.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess    = await authSchool();
    const sid     = sess.school_id;
    const body    = await req.json();
    const cls     = (body.class   ?? '').trim();
    const term    = (body.term    ?? '').trim();
    const session = (body.session ?? '').trim();

    if (!cls || !term || !session) {
      return err('class, term and session are required.');
    }

    // Count existing weeks to determine the next week number
    const existingRows = await query<{ week_label: string }[]>(
      `SELECT DISTINCT week_label FROM sh_attendance
       WHERE school_id=? AND class=? AND term=? AND session=?
       ORDER BY week_label`,
      [sid, cls, term, session]
    );
    const weekNumber = existingRows.length + 1;
    const weekLabel  = `Week ${weekNumber}`;

    // Get total weeks from current session for context
    const acadSession = await queryOne<{ attendance_weeks: number }>(
      'SELECT attendance_weeks FROM sh_acad_sessions WHERE school_id=? AND is_current=true LIMIT 1',
      [sid]
    );
    const totalWeeks = acadSession?.attendance_weeks ?? 14;

    if (weekNumber > totalWeeks) {
      return err(`All ${totalWeeks} weeks have already been added.`);
    }

    // Get all students in this class for this school
    const students = await query<{ id: string }[]>(
      'SELECT id FROM sh_students WHERE school_id=? AND class=? AND term=? AND session=?',
      [sid, cls, term, session]
    );

    // Insert blank attendance row for each student
    for (const s of students) {
      await execute(
        `INSERT INTO sh_attendance
           (school_id, student_id, class, term, session, week_label, week_start, days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (school_id, student_id, class, term, session, week_label) DO NOTHING`,
        [sid, s.id, cls, term, session, weekLabel, body.week_start ?? null, JSON.stringify([])]
      );
    }

    return ok({
      week_number: weekNumber,
      week_label:  weekLabel,
      total_weeks: totalWeeks,
      message: `${weekLabel} added (${students.length} student${students.length !== 1 ? 's' : ''}).`,
    });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not add attendance week.', 500);
  }
}
