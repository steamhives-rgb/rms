// POST /api/auth/forgot-password
// Generates a password reset token and emails it to the teacher.
// For school admin, a different flow may apply (manual reset via dev).
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { queryOne, execute } from '@/lib/db';
import { ok, err } from '@/lib/utils';
import { rmsLog } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json();
    const email = (body.email ?? '').toString().trim().toLowerCase();

    if (!email) return err('Email is required.');

    // Look up teacher by email (guard = 'teacher')
    const teacher = await queryOne<{ id: number; school_id: string; name: string }>(
      `SELECT t.id, t.school_id, t.name
       FROM sh_teachers t
       WHERE t.email = $1`,
      [email]
    );

    // Always return success to avoid email enumeration
    if (!teacher) {
      return ok({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate a secure token (hex, 64 chars)
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the token — upsert pattern: delete old + insert new
    await execute(
      `DELETE FROM sh_password_resets WHERE teacher_id = $1`,
      [teacher.id]
    );
    await execute(
      `INSERT INTO sh_password_resets (teacher_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [teacher.id, token, expiresAt.toISOString()]
    );

    // Send email if SMTP is configured
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    if (process.env.SMTP_HOST) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          host:   process.env.SMTP_HOST,
          port:   parseInt(process.env.SMTP_PORT ?? '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from:    process.env.SMTP_FROM ?? `"STEAMhives RMS" <noreply@steamhives.com>`,
          to:      email,
          subject: 'Password Reset — STEAMhives RMS',
          text:    `Hi ${teacher.name},\n\nClick the link below to reset your password (valid for 1 hour):\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
          html:    `
            <p>Hi <strong>${teacher.name}</strong>,</p>
            <p>Click the button below to reset your STEAMhives RMS password. This link is valid for <strong>1 hour</strong>.</p>
            <p>
              <a href="${resetLink}"
                 style="display:inline-block;padding:12px 24px;background:#fb923c;color:#fff;
                        border-radius:6px;text-decoration:none;font-weight:bold;">
                Reset Password
              </a>
            </p>
            <p>Or copy this link: <code>${resetLink}</code></p>
            <p>If you did not request this, you can safely ignore this email.</p>
          `,
        });
      } catch (mailErr) {
        console.error('[forgot-password] Email send failed:', mailErr);
        // Don't expose mail errors to client — token is still stored
      }
    } else {
      // Dev mode: log the reset link to console
      console.info(`[forgot-password] Reset link for ${email}: ${resetLink}`);
    }

    await rmsLog('FORGOT_PASSWORD', `Teacher ID: ${teacher.id}`, teacher.school_id);
    return ok({ message: 'If that email exists, a reset link has been sent.' });
  } catch (e) {
    console.error('[forgot-password]', e);
    return err('Could not process request.', 500);
  }
}
