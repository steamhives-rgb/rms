// GET | POST /api/attendance
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { authSchool, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const sess = await authSchool();
    const sid  = sess.school_id;
    const sp   = req.nextUrl.searchParams;

    const where: string[] = ['a.school_id=$1'];
    const params: unknown[] = [sid];

    for (const f of ['class', 'term', 'session', 'week_label']) {
      if (sp.get(f)) {
        params.push(sp.get(f));
        where.push(`a.${f}=$${params.length}`);
      }
    }

    const rows = await query<{ student_id: string; days: string | unknown[] }[]>(
      `SELECT a.*, s.name as student_name, s.adm
       FROM sh_attendance a
       LEFT JOIN sh_students s ON a.student_id=s.id
       WHERE ${where.join(' AND ')}`,
      params
    );

    for (const r of rows) {
      if (typeof r.days === 'string') r.days = JSON.parse(r.days || '[]');
    }

    return ok({ attendance: rows });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load attendance.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess    = await authSchool();
    const sid     = sess.school_id;
    const body    = await req.json();
    const records = body.records ?? [];

    for (const r of records) {
      await execute(
        `INSERT INTO sh_attendance
           (school_id, student_id, class, term, session, week_label, week_start, days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (school_id, student_id, class, term, session, week_label)
         DO UPDATE SET days = EXCLUDED.days`,
        [sid, r.student_id, r.class, r.term, r.session,
         r.week_label ?? '', r.week_start ?? null,
         JSON.stringify(r.days ?? [])]
      );
    }

    return ok({ message: 'Attendance saved.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not save attendance.', 500);
  }
}
