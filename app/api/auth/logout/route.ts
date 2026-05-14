// POST /api/auth/logout
import { execute } from '@/lib/db';
import { getToken } from '@/lib/auth';
import { ok } from '@/lib/utils';

export async function POST() {
  const token = getToken();
  if (token) {
    await execute('DELETE FROM sh_sessions WHERE token=?', [token]).catch(() => {});
  }

  const response = ok({ message: 'Logged out' });

  // Clear both session cookies — rms_dev_token must also be evicted so a
  // subsequent school login is not blocked by a stale dev token (Bug 2).
  const cookieOpts = 'HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
  response.headers.append('Set-Cookie', `rms_token=; ${cookieOpts}`);
  response.headers.append('Set-Cookie', `rms_dev_token=; ${cookieOpts}`);

  return response;
}
