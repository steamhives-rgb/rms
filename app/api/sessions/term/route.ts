// GET | POST | PUT /api/sessions/term — current term and attendance_weeks
import { NextRequest } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

const VALID_TERMS = ['1st Term', '2nd Term', '3rd Term'];

export async function GET() {
  try {
    const sess = await authSchoolAdmin();
    const row  = await queryOne<{ current_term: string | null }>(
      'SELECT current_term FROM sh_acad_sessions WHERE school_id=? AND is_current=true LIMIT 1',
      [sess.school_id]
    );
    return ok({ current_term: row?.current_term ?? '1st Term' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not get current term.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();
    const term = (body.term ?? '').trim();

    if (!VALID_TERMS.includes(term)) return err('Invalid term value.');

    await execute(
      'UPDATE sh_acad_sessions SET current_term=? WHERE school_id=? AND is_current=true',
      [term, sid]
    );

    await rmsLog('SAVE_CURRENT_TERM', `Term: ${term}`, sid);
    return ok({ message: 'Current term updated.', current_term: term });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not update current term.', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (body.attendance_weeks !== undefined) {
      const weeks = parseInt(String(body.attendance_weeks));
      if (isNaN(weeks) || weeks < 1 || weeks > 52) return err('attendance_weeks must be between 1 and 52.');
      updates.push('attendance_weeks=?');
      params.push(weeks);
    }

    if (body.resumption_date !== undefined) {
      updates.push('resumption_date=?');
      params.push(body.resumption_date ?? null);
    }

    if (!updates.length) return err('Nothing to update.');

    params.push(sid);
    await execute(
      `UPDATE sh_acad_sessions SET ${updates.join(', ')} WHERE school_id=? AND is_current=true`,
      params
    );

    await rmsLog('UPDATE_SESSION_TERM', `Updated: ${updates.join(', ')}`, sid);
    return ok({ message: 'Session updated.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not update session.', 500);
  }
}