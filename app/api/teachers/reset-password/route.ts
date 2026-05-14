// POST /api/teachers/reset-password — forgot-password token flow
// Body: { action: 'request', email } | { action: 'reset', token, password }
import { NextRequest } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPasswordFast, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const action = body.action ?? 'request';

    if (action === 'request') {
      const email = (body.email ?? '').trim();
      if (!email) return err('Email address is required.');

      const auth = await queryOne<{ id: number }>('SELECT id FROM sh_auth WHERE email=?', [email]);
      if (auth) {
        const rawToken    = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt   = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
        await execute(
          'INSERT INTO sh_password_resets (email,token,expires_at) VALUES (?,?,?) ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at',
          [email, hashedToken, expiresAt]
        );
        await rmsLog('PASSWORD_RESET_REQUESTED', email, null);
        // TODO: send email with reset link containing rawToken
      }
      return ok({ message: 'If the email exists, a reset link has been sent.' });
    }

    if (action === 'reset') {
      const token    = body.token ?? '';
      const password = body.password ?? '';
      if (!token || !password) return err('Token and password are required.');
      if (password.length < 8) return err('Password must be at least 8 characters.');

      const hashed = crypto.createHash('sha256').update(token).digest('hex');
      const reset  = await queryOne<{ email: string }>('SELECT email FROM sh_password_resets WHERE token=? AND expires_at > NOW()', [hashed]);
      if (!reset) return err('Invalid or expired reset token.', 400);

      const hash = await hashPasswordFast(password);
      await execute('UPDATE sh_auth SET password_hash=?, updated_at=NOW() WHERE email=?', [hash, reset.email]);
      await execute('DELETE FROM sh_password_resets WHERE token=?', [hashed]);
      await rmsLog('PASSWORD_RESET_SUCCESS', reset.email, null);
      return ok({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    }

    return err('Unknown action.', 400);
  } catch (e) {
    console.error('[reset-password]', e);
    return err('Could not process request.', 500);
  }
}
