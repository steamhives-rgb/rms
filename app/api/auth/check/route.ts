// GET /api/auth/check — validates session and returns school + optional teacher
import { cookies } from 'next/headers';
import { authCheckFull, AuthError, getDevKey, verifyDevToken } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const devToken = cookieStore.get('rms_dev_token')?.value;
    const rmsToken = cookieStore.get('rms_token')?.value;
    const devKey   = getDevKey();

    if (devToken && devKey && verifyDevToken(devToken, devKey)) {
      return ok({ school: null, is_dev: true });
    }

    const result = await authCheckFull();
    return ok(result);
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Auth check failed', 500);
  }
}