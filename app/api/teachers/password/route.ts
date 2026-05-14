// POST /api/teachers/password — admin reset teacher password
import { NextRequest } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, hashPasswordFast, generateTeacherPassword, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();
    const id   = parseInt(body.id ?? 0, 10);
    if (!id) return err('Teacher ID required.');

    const teacher = await queryOne<{ id: number }>('SELECT id FROM sh_teachers WHERE id=? AND school_id=?', [id, sid]);
    if (!teacher) return err('Teacher not found.', 404);

    const newPw = (body.password ?? '').trim() || generateTeacherPassword();
    const hash  = await hashPasswordFast(newPw);

    await execute('UPDATE sh_teachers SET password=? WHERE id=? AND school_id=?', [hash, id, sid]);
    // Sync to auth table
    await execute('UPDATE sh_auth SET password_hash=?, updated_at=NOW() WHERE teacher_id=?', [hash, id]).catch(() => {});

    await rmsLog('TEACHER_PWD_RESET', `Teacher ID: ${id}`, sid);
    return ok({ message: 'Password reset successfully.', new_password: newPw });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not reset password.', 500);
  }
}
