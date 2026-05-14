// POST /api/students/import — bulk import from parsed Excel rows
import { NextRequest } from 'next/server';
import { queryOne, withTransaction } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err, generateAdmission, toJsonField } from '@/lib/utils';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const sess     = await authSchoolAdmin();
    const sid      = sess.school_id;
    const body     = await req.json();
    const students = body.students ?? [];

    if (!students.length) return err('No students provided.');

    const school = await queryOne<{ student_limit: number | null }>(
      'SELECT student_limit FROM sh_schools WHERE id=?', [sid]
    );
    const countRow = await queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM sh_students WHERE school_id=?', [sid]
    );
    const limit    = school?.student_limit ?? null;
    let existing   = countRow?.cnt ?? 0;
    let saved      = 0;
    let skipped    = 0;

    for (const s of students) {
      if (limit !== null && (existing + saved) >= limit) { skipped++; continue; }

      const name    = (s.name ?? '').toString().trim();
      const cls     = (s.class ?? '').toString().trim();
      const term    = (s.term ?? '1st Term').toString().trim();
      const session = (s.session ?? '').toString().trim();

      if (!name || !cls) { skipped++; continue; }

      try {
        await withTransaction(async (conn) => {
          const adm = s.adm || await generateAdmission(sid, cls, session, conn);
          const id  = crypto.randomBytes(16).toString('hex');

            await conn.query(
              `INSERT INTO sh_students
               (id,school_id,adm,name,gender,dob,level,class,department,arm,term,session,house,clubs)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
              [
                id, sid, adm, name, s.gender ?? null,
                s.dob || null, s.level ?? null, cls,
                s.department ?? null, s.arm ?? null,
                term, session, s.house ?? null,
                toJsonField(s.clubs),
              ]
            );
        });
        saved++;
      } catch { skipped++; }
    }

    await rmsLog('IMPORT_STUDENTS', `Saved: ${saved}, Skipped: ${skipped}`, sid);
    return ok({ saved, skipped, message: `${saved} students imported.` });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Import failed.', 500);
  }
}
