// GET /api/teachers/results — teacher fetches their own results
// Auth: teacher session only
// Supports same query params as /api/results: class, term, session, result_type
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { authTeacher, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';
import { parseJsonField } from '@/lib/auth';
import type { SubjectResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { school_id } = await authTeacher();
    const sp = req.nextUrl.searchParams;

    const cls       = sp.get('class')       ?? '';
    const term      = sp.get('term')        ?? '';
    const session   = sp.get('session')     ?? '';
    const rType     = sp.get('result_type') ?? '';

    let sql = `SELECT id, student_id, student_adm, student_name, class, term, session,
                      result_type, avg, grade, position, out_of, created_at
               FROM sh_results
               WHERE school_id = ?`;
    const args: unknown[] = [school_id];

    if (cls)    { sql += ' AND class = ?';        args.push(cls); }
    if (term)   { sql += ' AND term = ?';         args.push(term); }
    if (session){ sql += ' AND session = ?';      args.push(session); }
    if (rType)  { sql += ' AND result_type = ?';  args.push(rType); }

    sql += ' ORDER BY student_name ASC, created_at DESC';

    const results = await query(sql, args);
    return ok({ results });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error('[teachers/results]', e);
    return err('Could not load results.', 500);
  }
}
