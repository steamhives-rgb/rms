// GET /api/results/pins           — list all pins for school
// POST /api/results/pins           — generate a new pin
// DELETE /api/results/pins         — revoke a pin
// GET  /api/results/pins?verify=1&pin=XXX  — public pin verification (no auth)
import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { authSchool, AuthError } from '@/lib/auth';
import { ok, err, generatePin } from '@/lib/utils';
import { addMonths, toMysqlDatetime } from '@/lib/utils';
import type { Pin, Result, SubjectResult } from '@/lib/types';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // ── Public PIN verification ───────────────────────────────────
  if (sp.get('verify') === '1') {
    const pin = (sp.get('pin') ?? '').toUpperCase().trim();
    if (!pin) return err('PIN is required.');

    const pinRow = await queryOne<Pin>('SELECT * FROM sh_pins WHERE pin=?', [pin]);
    if (!pinRow) return err('Invalid PIN.');
    if (pinRow.revoked) return err('This PIN has been revoked.');
    if (pinRow.expires_at && new Date(pinRow.expires_at) < new Date()) return err('This PIN has expired.');

    if (!pinRow.used) {
      await execute('UPDATE sh_pins SET used=true, used_at=NOW() WHERE id=?', [pinRow.id]);
    }

    const student = await queryOne<{ id: string; adm: string; name: string; class: string; term: string; session: string; passport: string | null }>(
      'SELECT id,adm,name,class,term,session,passport FROM sh_students WHERE id=?',
      [pinRow.student_id]
    );

    const resultTypes = pinRow.result_type === 'both' ? ['full','midterm'] : [pinRow.result_type];
    const placeholders = resultTypes.map(() => '?').join(',');
    const results = await query<Result[]>(
      `SELECT * FROM sh_results WHERE student_id=? AND school_id=? AND result_type IN (${placeholders}) ORDER BY created_at DESC`,
      [pinRow.student_id, pinRow.school_id, ...resultTypes]
    );
    for (const r of results) {
      r.subjects  = JSON.parse(r.subjects as unknown as string ?? '[]');
      r.affective = JSON.parse(r.affective as unknown as string ?? '{}');
    }

    const school = await queryOne<{ id: string; name: string; motto: string | null; address: string | null; school_logo: string | null; color1: string | null; color2: string | null }>(
      'SELECT id,name,motto,address,school_logo,color1,color2 FROM sh_schools WHERE id=?',
      [pinRow.school_id]
    );

    return ok({ student, school, results });
  }

  // ── Authenticated: list all pins ──────────────────────────────
  try {
    const sess = await authSchool();
    const pins = await query<Pin[]>(
      `SELECT p.*, s.name as student_name, s.adm as student_adm
       FROM sh_pins p LEFT JOIN sh_students s ON p.student_id=s.id
       WHERE p.school_id=? ORDER BY p.created_at DESC`,
      [sess.school_id]
    );
    return ok({ pins });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load pins.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchool();
    const sid  = sess.school_id;
    const body = await req.json();

    const studentId  = body.studentId ?? '';
    const resultType = body.resultType ?? 'both';
    const duration   = body.duration   ?? 'session';
    if (!studentId) return err('Student ID required.');

    const student = await queryOne<{ id: string; name: string; adm: string }>(
      'SELECT id,name,adm FROM sh_students WHERE id=? AND school_id=?',
      [studentId, sid]
    );
    if (!student) return err('Student not found.');

    const pin = await generatePin();
    const expiresAt = toMysqlDatetime(
      duration === 'session' ? addMonths(new Date(), 9) : addMonths(new Date(), 4)
    );

    await execute(
      'INSERT INTO sh_pins (school_id,student_id,pin,result_type,duration,expires_at) VALUES (?,?,?,?,?,?)',
      [sid, studentId, pin, resultType, duration, expiresAt]
    );

    return ok({ pin, student_name: student.name, student_adm: student.adm, expires_at: expiresAt });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not generate PIN.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchool();
    const body = await req.json();
    const id   = body.id ?? '';
    if (!id) return err('PIN ID required.');
    await execute('UPDATE sh_pins SET revoked=1 WHERE id=? AND school_id=?', [id, sess.school_id]);
    return ok({ message: 'PIN revoked.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not revoke PIN.', 500);
  }
}