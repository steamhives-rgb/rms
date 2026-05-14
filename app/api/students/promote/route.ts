// POST /api/students/promote — promote students to next class / session
//
//  Body (promote all):
//    { from_session, to_session }
//
//  Body (promote single class with custom target):
//    { from_session, to_session, from_class, to_class }
//
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';
import { PROMOTION_MAP } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const sess        = await authSchoolAdmin();
    const sid         = sess.school_id;
    const body        = await req.json();
    const fromSession = (body.from_session ?? '').trim();
    const toSession   = (body.to_session   ?? '').trim();
    if (!fromSession || !toSession) return err('from_session and to_session required.');

    const fromClass = (body.from_class ?? '').trim();
    const toClass   = (body.to_class   ?? '').trim();

    // ── Single-class promotion (custom target) ────────────────────
    if (fromClass && toClass) {
      const students = await query<{ id: string }[]>(
        'SELECT id FROM sh_students WHERE school_id=? AND session=? AND class=?',
        [sid, fromSession, fromClass]
      );
      for (const st of students) {
        await execute(
          'UPDATE sh_students SET class=?, session=? WHERE id=?',
          [toClass, toSession, st.id]
        );
      }
      await rmsLog(
        'PROMOTE_CLASS',
        `${fromClass} → ${toClass}, ${fromSession} → ${toSession}, Count: ${students.length}`,
        sid
      );
      return ok({
        promoted: students.length,
        terminal: 0,
        message: `${students.length} students promoted from ${fromClass} to ${toClass}.`,
      });
    }

    // ── Promote all students using default PROMOTION_MAP ─────────
    const students = await query<{ id: string; class: string }[]>(
      'SELECT id, class FROM sh_students WHERE school_id=? AND session=?',
      [sid, fromSession]
    );

    let promoted = 0;
    let terminal = 0;

    for (const st of students) {
      const nextClass = PROMOTION_MAP[st.class];
      await execute(
        'UPDATE sh_students SET class=?, session=? WHERE id=?',
        [nextClass ?? st.class, toSession, st.id]
      );
      if (nextClass) promoted++;
      else terminal++;
    }

    await rmsLog('PROMOTE_STUDENTS', `${fromSession} → ${toSession}, Promoted: ${promoted}, Terminal: ${terminal}`, sid);
    return ok({ promoted, terminal, message: `${promoted} students promoted. ${terminal} at terminal class.` });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not promote students.', 500);
  }
}