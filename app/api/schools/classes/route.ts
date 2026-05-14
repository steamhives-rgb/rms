// GET | POST | PATCH | DELETE /api/schools/classes
import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

interface SchoolClass {
  id: number;
  name: string;
  is_active: boolean;
  is_custom: boolean;
}

// GET /api/schools/classes
//   ?active=true   → only active classes          (used by teacher UI, PrintResults, etc.)
//   ?active=false  → only inactive classes
//   (no param)     → all classes (admin default)
//
// Auth: teachers and admins can both read classes.
export async function GET(req: NextRequest) {
  try {
    const sess        = await authSchool();  // teachers + admins
    const activeParam = req.nextUrl.searchParams.get('active');

    let sql    = 'SELECT * FROM sh_school_classes WHERE school_id=?';
    const args: (string | number | boolean)[] = [sess.school_id];

    if (activeParam === 'true') {
      sql  += ' AND is_active=true';
    } else if (activeParam === 'false') {
      sql  += ' AND is_active=false';
    }

    sql += ' ORDER BY sort_order ASC, name ASC';

    const classes = await query<SchoolClass[]>(sql, args);
    return ok({ classes });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load classes.', 500);
  }
}

// POST /api/schools/classes
// Body: { classes: string[], is_custom?: boolean }
//
// Extension — "apply to related classes":
// Body: { classes: string[], is_custom?: boolean, apply_related?: boolean }
// When apply_related=true and a class like "JSS 1" is added, the handler
// also queues "JSS 2" and "JSS 3" as suggestions in the response
// (relatedSuggestions: string[]) so the UI can offer a one-click bulk add.
const RELATED_GROUPS: string[][] = [
  ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
  ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'],
  ['JSS 1', 'JSS 2', 'JSS 3'],
  ['SS 1', 'SS 2', 'SS 3'],
  ['SSS 1', 'SSS 2', 'SSS 3'],
  ['Nursery 1', 'Nursery 2'],
  ['KG 1', 'KG 2'],
];

function findRelated(names: string[], existingNames: Set<string>): string[] {
  const related = new Set<string>();
  for (const name of names) {
    for (const group of RELATED_GROUPS) {
      if (group.includes(name)) {
        group.forEach(g => {
          if (!names.includes(g) && !existingNames.has(g)) related.add(g);
        });
      }
    }
  }
  return [...related];
}

export async function POST(req: NextRequest) {
  try {
    const sess     = await authSchoolAdmin();
    const sid      = sess.school_id;
    const body     = await req.json();
    const names: string[] = Array.isArray(body.classes) ? body.classes : [];
    const isCustom = !!body.is_custom;

    if (!names.length) return err('No class names provided.');

    // Get current max sort_order and existing class names
    const maxRow = await queryOne<{ max_order: number }>(
      'SELECT COALESCE(MAX(sort_order),0) AS max_order FROM sh_school_classes WHERE school_id=?',
      [sid]
    );
    let sortOrder = (maxRow?.max_order ?? 0) + 1;

    const existing = await query<{ name: string }[]>(
      'SELECT name FROM sh_school_classes WHERE school_id=?',
      [sid]
    );
    const existingNames = new Set(existing.map(r => r.name));

    const added: string[] = [];
    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      if (existingNames.has(trimmed)) continue; // skip duplicates
      await execute(
        'INSERT INTO sh_school_classes (school_id, name, is_active, is_custom, sort_order) VALUES (?,?,true,?,?)',
        [sid, trimmed, isCustom, sortOrder++]
      );
      existingNames.add(trimmed);
      added.push(trimmed);
    }

    await rmsLog('ADD_CLASSES', added.join(', '), sid);

    // "Apply to related classes" — suggest sibling classes not yet added
    const relatedSuggestions = findRelated(names, existingNames);

    return ok({
      message: `${added.length} class(es) added.`,
      added,
      relatedSuggestions, // non-empty only when sibling classes exist
    });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not add classes.', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const sp   = req.nextUrl.searchParams;
    const id   = sp.get('id');
    if (!id) return err('Class id required.');
    const body = await req.json();

    if (body.is_active !== undefined) {
      await execute(
        'UPDATE sh_school_classes SET is_active=? WHERE id=? AND school_id=?',
        [!!body.is_active, id, sid]
      );
    }
    return ok({ message: 'Class updated.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not update class.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sp   = req.nextUrl.searchParams;
    const id   = sp.get('id');
    if (!id) return err('Class id required.');
    await execute('DELETE FROM sh_school_classes WHERE id=? AND school_id=?', [id, sess.school_id]);
    return ok({ message: 'Class removed.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not remove class.', 500);
  }
}