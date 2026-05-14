// POST /api/auth/login  — School login
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyPassword, createSession, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';
import type { School } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schoolId = (body.school_id ?? '').toString().trim().toUpperCase();
    const password  = body.password ?? '';

    if (!schoolId || !password) {
      return err('School ID and password are required.');
    }

    const school = await queryOne<School & { password_hash: string }>(
      'SELECT * FROM sh_schools WHERE id=?',
      [schoolId]
    );

    if (!school || !(await verifyPassword(password, school.password_hash))) {
      return err('Invalid School ID or password.');
    }

    const token = await createSession(schoolId);
    await rmsLog('LOGIN', `School: ${school.name}`, schoolId);

    // Strip hash before sending
    const { password_hash: _, ...safeSchool } = school;

    const response = ok({ token, school: safeSchool });

    // Set the school session cookie and simultaneously evict any stale dev
    // token that would otherwise shadow this session in /api/auth/check (Bug 1).
    const cookieOpts = 'HttpOnly; Path=/; SameSite=Lax';
    response.headers.append('Set-Cookie', `rms_token=${token}; ${cookieOpts}; Max-Age=${60 * 60 * 8}`);
    response.headers.append('Set-Cookie', `rms_dev_token=; ${cookieOpts}; Max-Age=0`);

    return response;
  } catch (e) {
    console.error('[login]', e);
    return err('Login failed. Please try again.', 500);
  }
}
