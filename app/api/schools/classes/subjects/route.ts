// GET  /api/schools/classes/subjects?classId=N  — list subjects for a class
// POST /api/schools/classes/subjects            — save/upsert subjects for a class
//
// Bug 1 fix:
//   - Always resolves classId as integer (never passes class name as FK)
//   - Verifies class belongs to this school before writing
//   - Uses ON CONFLICT upsert so duplicate saves are handled gracefully
//   - Returns updated subject list after every save
import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

interface SubjectInput {
  name: string;
  sort_order?: number;
  department?: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const sess    = await authSchoolAdmin();
    const sid     = sess.school_id;
    const classId = parseInt(req.nextUrl.searchParams.get('classId') ?? req.nextUrl.searchParams.get('class_id') ?? '', 10);
    if (isNaN(classId)) return err('classId (integer) is required.');

    // Confirm class belongs to school
    const cls = await queryOne<{ id: number }>(
      'SELECT id FROM sh_school_classes WHERE id=? AND school_id=?',
      [classId, sid]
    );
    if (!cls) return err('Class not found.', 404);

    const dept = req.nextUrl.searchParams.get('department') ?? '';
    const subjectSql = dept
      ? 'SELECT * FROM sh_class_subjects WHERE class_id=? AND department=? ORDER BY sort_order ASC, name ASC'
      : 'SELECT * FROM sh_class_subjects WHERE class_id=? ORDER BY sort_order ASC, name ASC';
    const subjectParams = dept ? [classId, dept] : [classId];
    const subjects = await query(subjectSql, subjectParams);
    return ok({ subjects });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load subjects.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess    = await authSchoolAdmin();
    const sid     = sess.school_id;
    const body    = await req.json();

    // Bug fix: resolve classId as integer — never pass a class name as FK
    const classId = parseInt(body.classId ?? body.class_id ?? '', 10);
    if (isNaN(classId)) return err('classId (integer) is required.');

    // Accept both string[] and SubjectInput[] from frontend
    const rawSubjects: (string | SubjectInput)[] = Array.isArray(body.subjects) ? body.subjects : [];
    if (!rawSubjects.length) return err('subjects array is required.');
    const subjects: SubjectInput[] = rawSubjects.map((s, i) =>
      typeof s === 'string' ? { name: s, sort_order: i, department: body.department ?? null } : s
    );

    // Verify class belongs to this school
    const cls = await queryOne<{ id: number; name: string }>(
      'SELECT id, name FROM sh_school_classes WHERE id=? AND school_id=?',
      [classId, sid]
    );
    if (!cls) return err('Class not found.', 404);

    // Upsert each subject — ON CONFLICT handles duplicate saves gracefully
    for (const subject of subjects) {
      const name = (subject.name ?? '').trim();
      if (!name) continue;
      await execute(
        `INSERT INTO sh_class_subjects (class_id, school_id, name, sort_order, department)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (class_id, name) DO UPDATE
           SET sort_order = EXCLUDED.sort_order,
               department = EXCLUDED.department,
               updated_at = NOW()`,
        [classId, sid, name, subject.sort_order ?? 0, subject.department ?? null]
      );
    }

    await rmsLog('SAVE_CLASS_SUBJECTS', `Class ID: ${classId} (${cls.name}), Subjects: ${subjects.map(s => s.name).join(', ')}`, sid);

    // Return updated list so UI can replace local state rather than mutating
    const updated = await query(
      'SELECT * FROM sh_class_subjects WHERE class_id=? ORDER BY sort_order ASC, name ASC',
      [classId]
    );
    return ok({ subjects: updated, message: 'Subjects saved.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not save subjects.', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sess      = await authSchoolAdmin();
    const sid       = sess.school_id;
    const subjectId = parseInt(req.nextUrl.searchParams.get('id') ?? '', 10);
    if (isNaN(subjectId)) return err('id (integer) is required.');

    const body    = await req.json();
    const newName = (body.name ?? '').trim();
    if (!newName) return err('name is required.');

    // Confirm subject belongs to a class of this school
    const subject = await queryOne<{ id: number; class_id: number }>(
      `SELECT cs.id, cs.class_id FROM sh_class_subjects cs
       JOIN sh_school_classes sc ON cs.class_id = sc.id
       WHERE cs.id=? AND sc.school_id=?`,
      [subjectId, sid]
    );
    if (!subject) return err('Subject not found.', 404);

    await execute(
      'UPDATE sh_class_subjects SET name=?, updated_at=NOW() WHERE id=?',
      [newName, subjectId]
    );
    return ok({ message: 'Subject renamed.' });
  } catch (e) {
    if (e instanceof AuthError) return err((e as AuthError).message, (e as AuthError).status);
    return err('Could not rename subject.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess      = await authSchoolAdmin();
    const sid       = sess.school_id;
    const body      = await req.json();
    const subjectId = parseInt(body.subjectId ?? body.subject_id ?? '', 10);
    if (isNaN(subjectId)) return err('subjectId (integer) is required.');

    // Confirm subject belongs to a class of this school
    const subject = await queryOne<{ id: number; name: string; class_id: number }>(
      `SELECT cs.id, cs.name, cs.class_id
       FROM sh_class_subjects cs
       JOIN sh_school_classes sc ON cs.class_id = sc.id
       WHERE cs.id=? AND sc.school_id=?`,
      [subjectId, sid]
    );
    if (!subject) return err('Subject not found.', 404);

    await execute('DELETE FROM sh_class_subjects WHERE id=?', [subjectId]);
    return ok({ message: `Subject "${subject.name}" removed.` });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete subject.', 500);
  }
}