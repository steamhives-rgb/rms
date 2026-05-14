// GET /api/results/bf?student_id=&term= — brought-forward scores
import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError } from '@/lib/auth';
import { ok, err, parseJsonField } from '@/lib/utils';

type SubjectResult = { subject?: string; name?: string; total?: number; score?: number };

export async function GET(req: NextRequest) {
  try {
    const sess      = await authSchoolAdmin();
    const sid       = sess.school_id;
    const sp        = req.nextUrl.searchParams;
    const studentId = sp.get('student_id') ?? '';
    const term      = sp.get('term') ?? '';

    if (!studentId) return err('student_id required.');

    const termsToPull: string[] =
      term === '2nd Term' ? ['1st Term'] :
      term === '3rd Term' ? ['1st Term', '2nd Term'] : [];

    const bf: Record<string, Record<string, number>> = {};

    for (const t of termsToPull) {
      const row = await queryOne<{ subjects: string }>(
        'SELECT subjects FROM sh_results WHERE school_id=? AND student_id=? AND term=? AND result_type=? ORDER BY created_at DESC LIMIT 1',
        [sid, studentId, t, 'full']
      );
      if (row?.subjects) {
        const subjects = parseJsonField<SubjectResult[]>(row.subjects) ?? [];
        for (const s of subjects) {
          const subjectName = s.subject ?? s.name ?? '';
          const total       = Number(s.total ?? s.score ?? 0);
          if (!subjectName) continue;
          if (!bf[subjectName]) bf[subjectName] = {};
          bf[subjectName][t] = total;
        }
      }
    }

    return ok({ bf });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load BF scores.', 500);
  }
}
