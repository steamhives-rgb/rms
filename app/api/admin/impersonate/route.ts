// POST /api/admin/impersonate  — dev impersonates a school
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { authDev, AuthError, createSession, rmsLog } from '@/lib/auth';
import { err } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const devSess  = await authDev();
    const body     = await req.json();
    const schoolId = (body.school_id ?? '').toString().trim().toUpperCase();

    if (!schoolId) return err('school_id is required.');

    const school = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM sh_schools WHERE id = $1',
      [schoolId]
    );
    if (!school) return err('School not found.', 404);

    const token = await createSession(schoolId, /* isDev */ true, /* teacherId */ null);
    await rmsLog('DEV_IMPERSONATE', `Impersonating school: ${schoolId} (${school.name})`, schoolId);

    const response = NextResponse.json({ success: true, school });
    response.cookies.set('rms_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (e) {
    if (e instanceof AuthError) return err((e as AuthError).message, (e as AuthError).status);
    console.error('[admin/impersonate]', e);
    return err('Could not impersonate school.', 500);
  }
}