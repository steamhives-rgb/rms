// GET /api/sessions/active — returns the full active session for the school
// Used by: Attendance, Result Entry, Student Registration, any read-only session badge
import { authSchool, AuthError } from '@/lib/auth';
import { getActiveSession } from '@/lib/session';
import { ok, err } from '@/lib/utils';

export async function GET() {
  try {
    const sess   = await authSchool();
    const active = await getActiveSession(sess.school_id);
    if (!active) return err('No active academic session is set. Please configure one in Settings.', 404);
    return ok({ session: active });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load active session.', 500);
  }
}
