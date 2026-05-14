// POST /api/teachers/return-to-admin
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { getSession, createSession, AuthError } from '@/lib/auth';
import { err } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('rms_token')?.value;
    if (!token) return err('Not authenticated', 401);

    const sess = await getSession(token);
    if (!sess) return err('Session expired.', 401);
    if (!sess.teacher_id) return err('Not in an impersonation session.', 400);

    await execute('DELETE FROM sh_sessions WHERE token=?', [token]).catch(() => {});

    const adminToken = await createSession(sess.school_id, false, null);

    const response = NextResponse.json({ success: true });
    response.cookies.set('rms_token', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (e) {
    if (e instanceof AuthError) return err((e as AuthError).message, (e as AuthError).status);
    console.error('[return-to-admin]', e);
    return err('Could not return to admin.', 500);
  }
}