// GET  /api/students?class=&term=&session=  — list students
//   Bug 4 fix: if term/session are omitted, auto-resolves from active session
//   so Result Entry always gets students even when filters aren't explicitly passed.
// POST /api/students                        — save (upsert) a student
// DELETE /api/students                      — delete a student
import { NextRequest } from 'next/server';
import { query, queryOne, execute, withTransaction } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err, generateAdmission, toJsonField } from '@/lib/utils';
import { getActiveSession } from '@/lib/session';
import crypto from 'crypto';
import type { Student } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const sess = await authSchool();  // teachers + admins can list students
    const sid  = sess.school_id;
    const sp   = req.nextUrl.searchParams;

    const where: string[] = ['school_id=?'];
    const params: unknown[] = [sid];

    if (sp.get('class')) { where.push('class=?'); params.push(sp.get('class')); }

    // §2c fix: only auto-resolve term/session when caller explicitly passes auto_term=true
    // (used by ResultEntry, AttendanceModule). StudentsModule omits it → shows all terms.
    const autoTerm = sp.get('auto_term') === 'true';
    let resolvedTerm    = sp.get('term')    ?? '';
    let resolvedSession = sp.get('session') ?? '';

    if (autoTerm && (!resolvedTerm || !resolvedSession)) {
      const active = await getActiveSession(sid);
      if (active) {
        if (!resolvedTerm)    resolvedTerm    = active.current_term;
        if (!resolvedSession) resolvedSession = active.label;
      }
    }

    if (resolvedTerm)    { where.push('term=?');    params.push(resolvedTerm); }
    if (resolvedSession) { where.push('session=?'); params.push(resolvedSession); }

    const students = await query<Student[]>(
      `SELECT id,school_id,adm,name,gender,dob,level,class,department,arm,term,session,house,passport,clubs,guardian_name,guardian_phone,created_at
       FROM sh_students WHERE ${where.join(' AND ')} ORDER BY name ASC`,
      params
    );

    return ok({ students, term: resolvedTerm, session: resolvedSession });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load students.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();

    const name     = (body.name ?? '').toString().trim();
    const cls      = (body.class ?? '').toString().trim();

    // Bug 2 fix: auto-resolve session/term from active session — never rely on manual form input
    let term    = (body.term    ?? '').toString().trim();
    let session = (body.session ?? '').toString().trim();
    if (!term || !session) {
      const active = await getActiveSession(sid);
      if (active) {
        if (!term)    term    = active.current_term;
        if (!session) session = active.label;
      }
    }

    if (!term || !session) {
      return err('No active academic session found. Please set up an academic session first before adding students.');
    }
    const gender   = body.gender ?? null;
    const existingId = body.id ?? null;

    if (!name || !cls) return err('Name and class required.');

    // ── UPDATE ────────────────────────────────────────────────────
    if (existingId) {
      await execute(
        `UPDATE sh_students
         SET name=?,gender=?,dob=?,level=?,class=?,department=?,arm=?,term=?,session=?,
             house=?,passport=?,clubs=?,guardian_name=?,guardian_phone=?,updated_at=NOW()
         WHERE id=? AND school_id=?`,
        [
          name, gender, body.dob || null, body.level ?? null, cls,
          body.department ?? null, body.arm ?? null, term, session,
          body.house ?? null, body.passport ?? null,
          toJsonField(body.clubs),
          body.guardian_name ?? null, body.guardian_phone ?? null,
          existingId, sid,
        ]
      );
      return ok({ id: existingId, adm: body.adm, message: 'Student updated.' });
    }

    // ── CHECK LIMIT ───────────────────────────────────────────────
    const school = await queryOne<{ student_limit: number | null }>(
      'SELECT student_limit FROM sh_schools WHERE id=?', [sid]
    );
    const count = await queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM sh_students WHERE school_id=?', [sid]
    );
    if (school?.student_limit !== null && Number(count?.cnt ?? 0) >= (school?.student_limit ?? 0)) {
      return err('Student limit reached. Upgrade required.');
    }

    // ── INSERT (transaction-safe) ─────────────────────────────────
    const { id, adm } = await withTransaction(async (conn) => {
      const admNum = body.adm || await generateAdmission(sid, cls, session, conn);
      const newId  = crypto.randomBytes(16).toString('hex');

        await conn.query(
          `INSERT INTO sh_students
         (id,school_id,adm,name,gender,dob,level,class,department,arm,term,session,house,passport,clubs,guardian_name,guardian_phone)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            newId, sid, admNum, name, gender,
            body.dob || null, body.level ?? null, cls,
            body.department ?? null, body.arm ?? null,
            term, session,
            body.house ?? null, body.passport ?? null,
            toJsonField(body.clubs),
            body.guardian_name ?? null, body.guardian_phone ?? null,
          ]
        );
      return { id: newId, adm: admNum };
    });

    await rmsLog('ADD_STUDENT', `Name: ${name}, Adm: ${adm}, Class: ${cls}`, sid);
    return ok({ id, adm, message: 'Student added.' });
  } catch (e: unknown) {
    if (e instanceof AuthError) return err(e.message, e.status);
    const msg = e instanceof Error && e.message.includes('Duplicate')
      ? 'Duplicate admission number detected. Please retry.' : 'Could not save student.';
    return err(msg, e instanceof Error && e.message.includes('Duplicate') ? 409 : 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const body = await req.json();
    const id   = body.id ?? '';
    if (!id) return err('Student ID required.');
    await execute('DELETE FROM sh_students WHERE id=? AND school_id=?', [id, sess.school_id]);
    return ok({ message: 'Student deleted.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete student.', 500);
  }
}