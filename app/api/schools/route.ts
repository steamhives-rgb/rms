// GET /api/schools — list all schools (dev only)
import { query } from '@/lib/db';
import { authDev, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function GET() {
  try {
    await authDev();
    const schools = await query(
      'SELECT id, name FROM sh_schools ORDER BY name ASC'
    );
    return ok({ schools });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load schools.', 500);
  }
}
