// GET | POST | DELETE /api/subjects
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { authSchool, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET() {
  try {
    const sess = await authSchool();
    const subjects = await query(
      'SELECT * FROM sh_subjects WHERE school_id=? ORDER BY name',
      [sess.school_id]
    );
    return ok({ subjects });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load subjects.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchool();
    const sid = sess.school_id;
    const body = await req.json();

    if (!body.name) return err('Subject name is required.', 400);
    const name = body.name.trim();
    const code = body.code ?? null;
    const description = body.description ?? null;
    const department = body.department ?? null;
    const isCompulsory = body.is_compulsory !== undefined ? (body.is_compulsory ? 1 : 0) : 1;
    const classLevel = body.class_level ?? null;

    try {
      if (body.id) {
        await execute(
          'UPDATE sh_subjects SET name=?,code=?,description=?,department=?,is_compulsory=?,class_level=? WHERE id=? AND school_id=?',
          [name, code, description, department, isCompulsory, classLevel, body.id, sid]
        );
        return ok({ message: 'Subject updated.', id: body.id });
      } else {
        const res = await execute(
          'INSERT INTO sh_subjects (school_id,name,code,description,department,is_compulsory,class_level) VALUES (?,?,?,?,?,?,?)',
          [sid, name, code, description, department, isCompulsory, classLevel]
        );
        await rmsLog('ADD_SUBJECT', `Name: ${name}`, sid);
        return ok({ message: 'Subject created.', id: res.insertId }, 201);
      }
    } catch (ex) {
      if (ex instanceof Error && ex.message.includes('Duplicate')) {
        return err('A subject with this name already exists.', 409);
      }
      throw ex;
    }
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not save subject.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchool();
    const body = await req.json();
    if (!body.id) return err('Subject ID required.', 400);
    await execute('DELETE FROM sh_subjects WHERE id=? AND school_id=?', [body.id, sess.school_id]);
    return ok({ message: 'Subject deleted.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete subject.', 500);
  }
}
