// POST /api/teachers/impersonate
// Body: { teacher_id: number }
// Auth: school admin session
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, createSession } from '@/lib/auth';
import { err } from '@/lib/utils';
import type { Teacher } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sess      = await authSchoolAdmin();
    const sid       = sess.school_id;
    const body      = await req.json();
    const teacherId = Number(body.teacher_id);

    if (!teacherId) return NextResponse.json({ success: false, error: 'teacher_id required.' }, { status: 400 });

    const teacher = await queryOne<Teacher>(
      'SELECT id, name, approval_status FROM sh_teachers WHERE id=$1 AND school_id=$2',
      [teacherId, sid]
    );
    if (!teacher) return NextResponse.json({ success: false, error: 'Teacher not found.' }, { status: 404 });
    if (teacher.approval_status === 'rejected') {
      return NextResponse.json({ success: false, error: 'Cannot impersonate a rejected teacher.' }, { status: 403 });
    }

    const token = await createSession(sid, false, teacherId);

    const response = NextResponse.json({ success: true });
    response.cookies.set('rms_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    console.error('[teachers/impersonate]', e);
    return err('Could not impersonate teacher.', 500);
  }
}