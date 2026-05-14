// GET  /api/results             — list results for school (authenticated, with filters)
// GET  /api/results?verify=1   — public PIN verification (no auth)
// POST /api/results             — save / upsert a result
// DELETE /api/results           — delete a result by id
import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError } from '@/lib/auth';
import { ok, err, grade, gradeRemark, parseJsonField } from '@/lib/utils';
import type { Pin, Result, SubjectResult } from '@/lib/types';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // ── Public PIN verification ────────────────────────────────────
  if (sp.get('verify') === '1') {
    const pin = (sp.get('pin') ?? '').toUpperCase().trim();
    if (!pin) return err('PIN is required.');

    const pinRow = await queryOne<Pin>('SELECT * FROM sh_pins WHERE pin=?', [pin]);
    if (!pinRow) return err('Invalid PIN.');
    if (pinRow.revoked) return err('This PIN has been revoked.');
    if (pinRow.expires_at && new Date(pinRow.expires_at) < new Date()) return err('This PIN has expired.');

    if (!pinRow.used) {
      await execute('UPDATE sh_pins SET used=true, used_at=NOW() WHERE id=?', [pinRow.id]);
    }

    const student = await queryOne<{ id: string; adm: string; name: string; class: string; term: string; session: string; passport: string | null }>(
      'SELECT id,adm,name,class,term,session,passport FROM sh_students WHERE id=?',
      [pinRow.student_id]
    );

    const resultTypes = pinRow.result_type === 'both' ? ['full', 'midterm'] : [pinRow.result_type];
    const placeholders = resultTypes.map(() => '?').join(',');
    const results = await query<Result[]>(
      `SELECT * FROM sh_results WHERE student_id=? AND school_id=? AND result_type IN (${placeholders}) ORDER BY created_at DESC`,
      [pinRow.student_id, pinRow.school_id, ...resultTypes]
    );
    for (const r of results) {
      r.subjects  = parseJsonField<SubjectResult[]>(r.subjects as unknown as string) ?? [];
      r.affective = parseJsonField(r.affective as unknown as string) ?? {};
    }

    const school = await queryOne<{ id: string; name: string; motto: string | null; address: string | null; school_logo: string | null; color1: string | null; color2: string | null }>(
      'SELECT id,name,motto,address,school_logo,color1,color2 FROM sh_schools WHERE id=?',
      [pinRow.school_id]
    );

    return ok({ student, school, results });
  }

  // ── Authenticated: list results for school ─────────────────────
  try {
    const sess = await authSchool();
    const sid  = sess.school_id;

    const cls     = sp.get('class')       ?? '';
    const term    = sp.get('term')        ?? '';
    const session = sp.get('session')     ?? '';
    const rType   = sp.get('result_type') ?? '';

    let sql = `SELECT id, student_id, student_adm, student_name, class, term, session,
                      result_type, subjects, affective, avg, grade, position, out_of,
                      teacher_name, teacher_comment, principal_comment, created_at
               FROM sh_results
               WHERE school_id = ?`;
    const args: unknown[] = [sid];

    if (cls)     { sql += ' AND class = ?';        args.push(cls); }
    if (term)    { sql += ' AND term = ?';         args.push(term); }
    if (session) { sql += ' AND session = ?';      args.push(session); }
    if (rType)   { sql += ' AND result_type = ?';  args.push(rType); }

    sql += ' ORDER BY student_name ASC, created_at DESC';

    const results = await query<Result[]>(sql, args);

    // Parse subjects and affective JSON for every row
    for (const r of results) {
      r.subjects  = parseJsonField<SubjectResult[]>(r.subjects as unknown as string) ?? [];
      r.affective = parseJsonField(r.affective as unknown as string) ?? {};
    }

    return ok({ results });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load results.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchool();
    const sid  = sess.school_id;
    const body = await req.json();

    const studentId       = (body.studentId ?? '').trim();
    const resultType      = body.resultType ?? 'full';
    const subjects        = body.subjects ?? [];
    const affective       = body.affective ?? {};
    const teacherName     = (body.teacherName ?? '').trim();
    const teacherComment  = (body.teacherComment ?? '').trim();
    const principalComment= (body.principalComment ?? '').trim();

    if (!studentId) return err('Student ID required.');
    if (!subjects.length) return err('At least one subject required.');

    const student = await queryOne<{ id: string; adm: string; name: string; class: string; term: string; session: string; passport: string | null }>(
      'SELECT id,adm,name,class,term,session,passport FROM sh_students WHERE id=? AND school_id=?',
      [studentId, sid]
    );
    if (!student) return err('Student not found.');

    // Calculate stats
    const totals: number[] = subjects.map((s: SubjectResult) => Number(s.total) || 0);
    const overallTotal = totals.reduce((a: number, b: number) => a + b, 0);
    const avg          = totals.length ? overallTotal / totals.length : 0;
    const topGrade     = grade(avg);

    // Get position among class peers
    const classmates = await query<{ id: string; avg: number }[]>(
      `SELECT id, avg FROM sh_results
       WHERE school_id=? AND class=? AND term=? AND session=? AND result_type=? AND student_id != ?
       ORDER BY avg DESC`,
      [sid, student.class, student.term, student.session, resultType, studentId]
    );
    const position = classmates.filter(r => (r.avg ?? 0) > avg).length + 1;
    const outOf    = classmates.length + 1;

    await execute(
      `INSERT INTO sh_results
         (school_id, student_id, student_adm, student_name, class, term, session,
          result_type, subjects, affective, overall_total, avg, grade, position, out_of,
          teacher_name, teacher_comment, principal_comment)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT (school_id, student_id, class, term, session, result_type)
       DO UPDATE SET
         subjects          = EXCLUDED.subjects,
         affective         = EXCLUDED.affective,
         overall_total     = EXCLUDED.overall_total,
         avg               = EXCLUDED.avg,
         grade             = EXCLUDED.grade,
         position          = EXCLUDED.position,
         out_of            = EXCLUDED.out_of,
         teacher_name      = EXCLUDED.teacher_name,
         teacher_comment   = EXCLUDED.teacher_comment,
         principal_comment = EXCLUDED.principal_comment,
         updated_at        = NOW()`,
      [
        sid, studentId, student.adm, student.name,
        student.class, student.term, student.session, resultType,
        JSON.stringify(subjects), JSON.stringify(affective),
        overallTotal, avg, topGrade, position, outOf,
        teacherName, teacherComment, principalComment,
      ]
    );

    // Recalculate positions for all classmates after upsert
    const allInClass = await query<{ id: string; avg: number }[]>(
      `SELECT id, avg FROM sh_results
       WHERE school_id=? AND class=? AND term=? AND session=? AND result_type=?
       ORDER BY avg DESC`,
      [sid, student.class, student.term, student.session, resultType]
    );
    const total = allInClass.length;
    for (let i = 0; i < allInClass.length; i++) {
      await execute(
        'UPDATE sh_results SET position=?, out_of=? WHERE id=?',
        [i + 1, total, allInClass[i].id]
      );
    }

    return ok({ message: 'Result saved.', avg: parseFloat(avg.toFixed(2)) });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error('[results POST]', e);
    return err('Could not save result.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const body = await req.json();
    const id   = body.id ?? '';
    if (!id) return err('Result ID required.');
    await execute('DELETE FROM sh_results WHERE id=? AND school_id=?', [id, sess.school_id]);
    return ok({ message: 'Result deleted.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete result.', 500);
  }
}
