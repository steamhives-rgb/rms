// POST /api/teachers/login-as — admin impersonate teacher
import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, createSession, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const sess      = await authSchoolAdmin();
    const sid       = sess.school_id;
    const body      = await req.json();
    const teacherId = parseInt(body.teacher_id ?? 0, 10);
    if (!teacherId) return err('teacher_id required.');

    const teacher = await queryOne<{ id: number; name: string; employee_id: string }>(
      'SELECT id, name, employee_id FROM sh_teachers WHERE id=? AND school_id=?',
      [teacherId, sid]
    );
    if (!teacher) return err('Teacher not found.', 404);

    const token = await createSession(sid, false, teacherId);
    await rmsLog('ADMIN_LOGIN_AS', `Impersonating teacher ${teacherId} (${teacher.name})`, sid);

    const response = ok({ token, teacher, message: `Session created for ${teacher.name}` });
    response.headers.set(
      'Set-Cookie',
      `rms_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 8}`
    );
    return response;
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not create teacher session.', 500);
  }
}
