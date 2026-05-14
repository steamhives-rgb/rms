// GET /api/schools/settings — get school settings
// POST /api/schools/settings — update school settings
import { NextRequest } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, verifyPassword, hashPassword, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';
import type { School } from '@/lib/types';

const ALLOWED_FIELDS = [
  'name','motto','address','phone','email','color1','color2',
  'school_logo','school_stamp','sig_principal','head_signature',
  'principal_name','head_teacher_name','show_position','show_bf',
  'name_primary','name_secondary','school_name_size',
] as const;

export async function GET() {
  try {
    const sess = await authSchoolAdmin();
    const school = await queryOne<School>(
      'SELECT * FROM sh_schools WHERE id=?',
      [sess.school_id]
    );
    if (!school) return err('School not found', 404);
    // Strip hash
    const { ...safeSchool } = school as School & { password_hash?: string };
    delete safeSchool.password_hash;
    return ok({ settings: safeSchool });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load settings.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const f of ALLOWED_FIELDS) {
      if (f in body) {
        fields.push(`${f}=?`);
        params.push(body[f]);
      }
    }

    // Password change
    if (body.new_password) {
      if ((body.new_password as string).length < 6) {
        return err('New password must be at least 6 characters.');
      }
      const row = await queryOne<{ password_hash: string }>(
        'SELECT password_hash FROM sh_schools WHERE id=?', [sid]
      );
      if (body.current_password && row) {
        const valid = await verifyPassword(body.current_password, row.password_hash);
        if (!valid) return err('Current password is incorrect.');
      }
      fields.push('password_hash=?');
      params.push(await hashPassword(body.new_password));
    }

    if (!fields.length) return err('Nothing to update.');

    params.push(sid);
    await execute(
      `UPDATE sh_schools SET ${fields.join(',')} WHERE id=?`,
      params
    );
    await rmsLog('SAVE_SETTINGS', Object.keys(body).join(','), sid);

    return ok({ message: 'Settings saved.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not save settings.', 500);
  }
}

// PUT is an alias for POST (same update logic)
export { POST as PUT };