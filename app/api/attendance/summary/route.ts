// GET /api/attendance/summary?class=&term=&session=
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authSchool, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const sess    = await authSchool();
    const sid     = sess.school_id;
    const sp      = req.nextUrl.searchParams;
    const cls     = sp.get('class');
    const term    = sp.get('term');
    const session = sp.get('session');

    if (!cls || !term || !session) return err('class, term, session required.', 400);

    const rows = await query<{ student_id: string; days: string }[]>(
      'SELECT student_id, days FROM sh_attendance WHERE school_id=? AND class=? AND term=? AND session=?',
      [sid, cls, term, session]
    );

    const sessRow = await queryOne<{ days_opened: number | null; next_term_begins: string | null }>(
      'SELECT days_opened, next_term_begins FROM sh_acad_sessions WHERE school_id=? AND label=? LIMIT 1',
      [sid, session]
    );

    const summary: Record<string, { days_present: number; days_late: number; days_absent: number }> = {};

    for (const r of rows) {
      const stId = r.student_id;
      const days: { am?: string; pm?: string; late?: boolean }[] = JSON.parse(r.days || '[]');
      if (!summary[stId]) summary[stId] = { days_present: 0, days_late: 0, days_absent: 0 };

      for (const d of days) {
        const am = d.am ?? 'absent';
        const pm = d.pm ?? 'absent';
        const isLate    = am === 'late' || pm === 'late' || Boolean(d.late);
        const isPresent = am !== 'absent' || pm !== 'absent';
        if (isPresent)   summary[stId].days_present++;
        else if (isLate) summary[stId].days_late++;
        else             summary[stId].days_absent++;
      }
    }

    return ok({
      summary,
      days_opened: sessRow?.days_opened ?? null,
      next_term_begins: sessRow?.next_term_begins ?? null,
    });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load attendance summary.', 500);
  }
}
