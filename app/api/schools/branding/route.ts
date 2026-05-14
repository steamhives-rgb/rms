// POST /api/schools/branding — dev: save school branding assets
import { NextRequest } from 'next/server';
import { execute } from '@/lib/db';
import { authDev, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await authDev();
    const body    = req.body ? await req.json() : {};
    const schoolId = body.school_id ?? '';
    if (!schoolId) return err('School ID required.');

    const fields: string[] = [];
    const params: unknown[] = [];
    for (const f of ['school_stamp', 'sig_principal', 'school_logo'] as const) {
      if (f in body) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (!fields.length) return err('Nothing to update.');

    params.push(schoolId);
    await execute(`UPDATE sh_schools SET ${fields.join(',')} WHERE id=?`, params);
    await rmsLog('DEV_SAVE_BRANDING', `School: ${schoolId}`, null);
    return ok({ message: 'Branding saved.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not save branding.', 500);
  }
}
