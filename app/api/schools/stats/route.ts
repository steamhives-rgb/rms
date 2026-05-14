// GET /api/schools/stats — dashboard stats
import { queryOne } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET() {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;

    const [students, results, classCount, avgRow, school] = await Promise.all([
      queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM sh_students WHERE school_id=?', [sid]),
      queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM sh_results WHERE school_id=?', [sid]),
      queryOne<{ cnt: number }>('SELECT COUNT(DISTINCT class) as cnt FROM sh_students WHERE school_id=?', [sid]),
      queryOne<{ school_avg: number | null }>('SELECT AVG(avg) as school_avg FROM sh_results WHERE school_id=? AND result_type="full"', [sid]),
      queryOne<{ student_limit: number | null; plan_label: string }>('SELECT student_limit, plan_label FROM sh_schools WHERE id=?', [sid]),
    ]);

    return ok({
      students:      students?.cnt ?? 0,
      results:       results?.cnt ?? 0,
      classes:       classCount?.cnt ?? 0,
      school_avg:    Math.round((avgRow?.school_avg ?? 0) * 10) / 10,
      student_limit: school?.student_limit ?? null,
      plan_label:    school?.plan_label ?? '',
    });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load stats.', 500);
  }
}
