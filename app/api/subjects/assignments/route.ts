// GET | POST /api/subjects/assignments
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { authSchool, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET() {
  try {
    const sess = await authSchool();
    const assignments = await query(
      `SELECT sa.*, s.name as subject_name, s.department, t.name as teacher_name
       FROM sh_subject_assignments sa
       LEFT JOIN sh_subjects s ON sa.subject_id=s.id
       LEFT JOIN sh_teachers t ON sa.teacher_id=t.id
       WHERE sa.school_id=? ORDER BY sa.class, s.name`,
      [sess.school_id]
    );
    return ok({ assignments });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load assignments.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchool();
    const sid  = sess.school_id;
    const body = await req.json();

    if (!body.subject_id || !body.class) return err('subject_id and class are required.', 400);

    await execute(
      `INSERT INTO sh_subject_assignments (school_id,subject_id,class,teacher_id,term,session)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT (school_id, subject_id, class) DO UPDATE SET teacher_id = EXCLUDED.teacher_id`,
      [sid, body.subject_id, body.class, body.teacher_id ?? null, body.term ?? null, body.session ?? null]
    );
    await rmsLog('ASSIGN_SUBJECT', `Subject ${body.subject_id} → ${body.class}`, sid);
    return ok({ message: 'Subject assigned to class.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not assign subject.', 500);
  }
}
