// GET /api/results/broadsheet?class=&term=&session=&result_type=
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError } from '@/lib/auth';
import { ok, err, parseJsonField } from '@/lib/utils';
import type { Result, SubjectResult } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const sp   = req.nextUrl.searchParams;

    const cls        = sp.get('class') ?? '';
    const term       = sp.get('term') ?? '';
    const session    = sp.get('session') ?? '';
    const resultType = sp.get('result_type') ?? 'full';

    if (!cls || !term || !session) return err('class, term, and session are required.');

    const results = await query<Result[]>(
      `SELECT r.*, s.passport as passport_img FROM sh_results r
       LEFT JOIN sh_students s ON r.student_id=s.id
       WHERE r.school_id=? AND r.class=? AND r.term=? AND r.session=? AND r.result_type=?
       ORDER BY r.avg DESC`,
      [sid, cls, term, session, resultType]
    );

    for (const r of results) {
      r.subjects  = parseJsonField<SubjectResult[]>(r.subjects as unknown as string) ?? [];
      r.affective = parseJsonField(r.affective as unknown as string) ?? {};
    }

    // Collect unique subjects across all students
    const subjectSet = new Set<string>();
    for (const r of results) {
      for (const s of r.subjects) subjectSet.add(s.name);
    }

    return ok({ results, subjects: Array.from(subjectSet).sort() });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load broadsheet.', 500);
  }
}
