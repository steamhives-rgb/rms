// POST /api/auth/teacher-login
// Accepts: employee_id (or email) + password — school_id is optional (auto-detected from employee_id)
import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { verifyPassword, createSession, rmsLog } from '@/lib/auth';
import { err, parseJsonField } from '@/lib/utils';
import type { Teacher } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schoolIdInput = (body.school_id ?? '').toString().trim().toUpperCase();
    const empId    = (body.employee_id ?? '').toString().trim();
    const password = (body.password ?? '').toString().trim();

    if (!empId || !password) {
      return NextResponse.json({ success: false, error: 'Employee ID and password are required.' }, { status: 400 });
    }

    let teacher: (Teacher & { password: string; school_id: string }) | null = null;

    if (schoolIdInput) {
      // Legacy: school_id provided
      teacher = await queryOne<Teacher & { password: string; school_id: string }>(
        'SELECT * FROM sh_teachers WHERE school_id=$1 AND UPPER(employee_id)=UPPER($2)',
        [schoolIdInput, empId]
      );
      if (!teacher) {
        teacher = await queryOne<Teacher & { password: string; school_id: string }>(
          'SELECT * FROM sh_teachers WHERE school_id=$1 AND email=$2',
          [schoolIdInput, empId]
        );
      }
    } else {
      // No school_id — look up by employee_id globally (it's unique per school prefix)
      teacher = await queryOne<Teacher & { password: string; school_id: string }>(
        'SELECT * FROM sh_teachers WHERE UPPER(employee_id)=UPPER($1) LIMIT 1',
        [empId]
      );
      if (!teacher) {
        teacher = await queryOne<Teacher & { password: string; school_id: string }>(
          'SELECT * FROM sh_teachers WHERE email=$1 LIMIT 1',
          [empId]
        );
      }
    }

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'No teacher account found with that ID.' }, { status: 401 });
    }

    const schoolId = teacher.school_id;

    if (teacher.approval_status === 'rejected') {
      return NextResponse.json({ success: false, error: 'Your account has been rejected. Contact your school admin.' }, { status: 403 });
    }
    if (teacher.approval_status === 'pending') {
      return NextResponse.json({ success: false, error: 'Your account is pending approval by the school administrator.' }, { status: 403 });
    }

    // teacher_id is UNIQUE in sh_auth — query by it alone to avoid school_id
    // casing/format mismatches that cause silent lookup failures (401s).
    let auth = await queryOne<{ id: number; password_hash: string }>(
      'SELECT id, password_hash FROM sh_auth WHERE teacher_id=$1',
      [teacher.id]
    );
    if (!auth && teacher.email) {
      // Email fallback — scoped to school to avoid cross-school collisions
      auth = await queryOne<{ id: number; password_hash: string }>(
        'SELECT id, password_hash FROM sh_auth WHERE email=$1 AND school_id=$2',
        [teacher.email, schoolId]
      );
    }

    const teacherPwIsHash = teacher.password?.startsWith('$2');
    // If there's still no sh_auth row (e.g. legacy teacher created before this fix),
    // migrate the bcrypt hash from sh_teachers → sh_auth now so subsequent logins work.
    if (!auth && teacher.password && teacherPwIsHash) {
      await execute(
        'INSERT INTO sh_auth (school_id, teacher_id, email, password_hash, guard) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (teacher_id) DO UPDATE SET password_hash=EXCLUDED.password_hash, updated_at=NOW()',
        [schoolId, teacher.id, teacher.email ?? null, teacher.password, 'web']
      ).catch(() => {});
      auth = { id: 0, password_hash: teacher.password };
    }

    if (!auth && teacher.password && !teacherPwIsHash) {
      return NextResponse.json({ success: false, error: 'Your account needs a password reset. Contact your school admin.' }, { status: 401 });
    }

    const hashToCheck = auth?.password_hash ?? teacher.password;
    if (!hashToCheck) {
      return NextResponse.json({ success: false, error: 'No password set. Contact your school admin.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, hashToCheck);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 });
    }

    const token = await createSession(schoolId, false, teacher.id);
    await rmsLog('TEACHER_LOGIN', `Teacher ${teacher.employee_id} logged in`, schoolId);

    teacher.subjects    = parseJsonField<string[]>(teacher.subjects as unknown as string) ?? [];
    teacher.admin_tasks = parseJsonField<string[]>(teacher.admin_tasks as unknown as string) ?? [];
    teacher.classes     = parseJsonField<string[]>(teacher.classes as unknown as string) ?? (teacher.class ? [teacher.class] : []);
    delete (teacher as { password?: string }).password;

    const response = NextResponse.json({ success: true, teacher });
    response.cookies.set('rms_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (e) {
    console.error('[teacher-login]', e);
    return NextResponse.json({ success: false, error: 'Login failed. Please try again.' }, { status: 500 });
  }
}