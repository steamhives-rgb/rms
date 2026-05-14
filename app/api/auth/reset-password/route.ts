// POST /api/auth/reset-password
// Validates a reset token and sets a new password for the teacher.
import { NextRequest } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPasswordFast, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json();
    const token    = (body.token    ?? '').toString().trim();
    const password = (body.password ?? '').toString();

    if (!token)    return err('Reset token is required.');
    if (!password || password.length < 8) return err('Password must be at least 8 characters.');

    // Look up the token
    const reset = await queryOne<{
      id: number;
      teacher_id: number;
      expires_at: string;
    }>(
      `SELECT id, teacher_id, expires_at
       FROM sh_password_resets
       WHERE token = $1`,
      [token]
    );

    if (!reset) return err('Invalid or expired reset link.');

    // Check expiry
    if (new Date(reset.expires_at) < new Date()) {
      await execute(`DELETE FROM sh_password_resets WHERE id = $1`, [reset.id]);
      return err('This reset link has expired. Please request a new one.');
    }

    // Get teacher's school_id for logging
    const teacher = await queryOne<{ school_id: string; email: string }>(
      `SELECT school_id, email FROM sh_teachers WHERE id = $1`,
      [reset.teacher_id]
    );
    if (!teacher) return err('Teacher account not found.');

    // Hash and update password in sh_auth
    const hash = await hashPasswordFast(password);

    // Update sh_auth record (guard='teacher', linked to teacher_id)
    const updated = await execute(
      `UPDATE sh_auth SET password_hash = $1
       WHERE teacher_id = $2 AND guard = 'teacher'`,
      [hash, reset.teacher_id]
    );

    // If no sh_auth row exists yet (teacher added manually), insert one
    if (updated.rowCount === 0) {
      await execute(
        `INSERT INTO sh_auth (school_id, teacher_id, email, password_hash, guard)
         VALUES ($1, $2, $3, $4, 'teacher')`,
        [teacher.school_id, reset.teacher_id, teacher.email, hash]
      );
    }

    // Consume the token
    await execute(`DELETE FROM sh_password_resets WHERE id = $1`, [reset.id]);

    await rmsLog('RESET_PASSWORD', `Teacher ID: ${reset.teacher_id}`, teacher.school_id);
    return ok({ message: 'Password updated successfully. You can now log in.' });
  } catch (e) {
    console.error('[reset-password]', e);
    return err('Could not reset password.', 500);
  }
}
