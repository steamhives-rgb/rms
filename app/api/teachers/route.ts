// GET | POST | DELETE /api/teachers
import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, rmsLog, hashPasswordFast, generateTeacherPassword } from '@/lib/auth';
import { ok, err, nextEmployeeId, parseJsonField, toJsonField } from '@/lib/utils';
import type { Teacher } from '@/lib/types';

export async function GET() {
  try {
    const sess     = await authSchoolAdmin();
    const teachers = await query<Teacher[]>(
      'SELECT * FROM sh_teachers WHERE school_id=? ORDER BY class ASC',
      [sess.school_id]
    );
    for (const t of teachers) {
      t.subjects    = parseJsonField<string[]>(t.subjects as unknown as string) ?? [];
      t.admin_tasks = parseJsonField<string[]>(t.admin_tasks as unknown as string) ?? [];
      t.classes     = parseJsonField<string[]>(t.classes as unknown as string) ?? (t.class ? [t.class] : []);
      delete (t as { password?: string }).password;
    }
    return ok({ teachers });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load teachers.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();

    const name  = (body.name ?? '').trim();
    if (!name) return err('Teacher name is required.');

    const cls           = (body.class ?? '').trim() || null;
    const isClassTeacher = !!body.is_class_teacher;
    const role          = body.role ?? 'both';
    const subjects      = toJsonField(body.subjects);
    const adminTasks    = toJsonField(body.admin_tasks);
    const classesJson   = toJsonField(body.classes ?? (cls ? [cls] : []));
    const emailInput    = (body.email ?? '').trim();
    const approvalStatus= body.approval_status ?? 'approved';
    const selfRegistered= body.self_registered ? 1 : 0;

    // Auto-generate employee_id if missing
    let empId = (body.employee_id ?? '').trim();
    if (!empId) empId = await nextEmployeeId(sid);

    // Duplicate email check within school
    if (emailInput) {
      const dup = await queryOne<{ id: number }>(
        'SELECT id FROM sh_teachers WHERE school_id=? AND email=? AND id != ?',
        [sid, emailInput, body.id ?? 0]
      );
      if (dup) return err('A teacher with this email already exists in this school.', 409);
    }

    // Find existing by id or employee_id
    let existingRow = body.id
      ? await queryOne<{ id: number }>('SELECT id FROM sh_teachers WHERE id=? AND school_id=?', [body.id, sid])
      : await queryOne<{ id: number }>('SELECT id FROM sh_teachers WHERE school_id=? AND employee_id=?', [sid, empId]);

    let pwHash: string | null = null;
    let generatedPw: string | null = null;

    const pwInput = (body.password ?? '').trim();
    if (pwInput) {
      pwHash = await hashPasswordFast(pwInput);
    } else if (!existingRow) {
      // New teacher — generate a password
      generatedPw = generateTeacherPassword();
      pwHash = await hashPasswordFast(generatedPw);
    }

    let teacherId: number;

    if (existingRow) {
      teacherId = existingRow.id;
      const upFields = [
        'name=?','class=?','signature=?','employee_id=?','gender=?','phone=?','email=?',
        'dob=?','qualification=?','specialisation=?','hire_date=?','role=?',
        'is_class_teacher=?','subjects=?','avatar=?','admin_tasks=?','classes=?',
        'address=?','department=?','staff_type=?',
      ];
      const upParams: unknown[] = [
        name, cls, body.signature ?? null, empId,
        body.gender ?? null, body.phone ?? null, emailInput || null,
        body.dob || null, body.qualification ?? null, body.specialisation ?? null,
        body.hire_date || null, role, isClassTeacher, subjects,
        body.avatar ?? null, adminTasks, classesJson,
        body.address ?? null, body.department ?? null, body.staff_type ?? null,
      ];
      if (pwHash) { upFields.push('password=?'); upParams.push(pwHash); }
      if (body.approval_status) { upFields.push('approval_status=?'); upParams.push(approvalStatus); }
      if (body.rejection_reason !== undefined) { upFields.push('rejection_reason=?'); upParams.push(body.rejection_reason); }
      upParams.push(teacherId);
      await execute(`UPDATE sh_teachers SET ${upFields.join(',')} WHERE id=?`, upParams);

      // Sync email/password to sh_auth
      if (emailInput) {
        const authRow = await queryOne<{ id: number }>('SELECT id FROM sh_auth WHERE teacher_id=?', [teacherId]);
        if (authRow) {
          const auFields = ['email=?', 'updated_at=NOW()'];
          const auParams: unknown[] = [emailInput];
          if (pwHash) { auFields.push('password_hash=?'); auParams.push(pwHash); }
          auParams.push(teacherId);
          await execute(`UPDATE sh_auth SET ${auFields.join(',')} WHERE teacher_id=?`, auParams).catch(() => {});
        } else if (pwHash) {
          await execute(
            'INSERT INTO sh_auth (school_id,teacher_id,email,password_hash,guard) VALUES (?,?,?,?,?)',
            [sid, teacherId, emailInput, pwHash, 'web']
          ).catch(() => {});
        }
      }
    } else {
      const res = await execute(
        `INSERT INTO sh_teachers
           (school_id,class,name,signature,employee_id,gender,phone,email,
            dob,qualification,specialisation,hire_date,role,is_class_teacher,
            subjects,avatar,password,admin_tasks,classes,address,department,
            staff_type,approval_status,self_registered)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [sid, cls, name, body.signature ?? null, empId,
         body.gender ?? null, body.phone ?? null, emailInput || null,
         body.dob || null, body.qualification ?? null, body.specialisation ?? null,
         body.hire_date || null, role, isClassTeacher, subjects,
         body.avatar ?? null, pwHash, adminTasks, classesJson,
         body.address ?? null, body.department ?? null, body.staff_type ?? null,
         approvalStatus, selfRegistered]
      );
      teacherId = res.insertId!;

      if (pwHash) {
        // Always create/update the auth record so the teacher can log in,
        // even when no email was provided (email column may be NULL).
        await execute(
          'INSERT INTO sh_auth (school_id,teacher_id,email,password_hash,guard) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (teacher_id) DO UPDATE SET email=EXCLUDED.email, password_hash=EXCLUDED.password_hash, updated_at=NOW()',
          [sid, teacherId, emailInput || null, pwHash, 'web']
        ).catch(() => {});
      }
    }

    // Return saved teacher
    const saved = await queryOne<Teacher>('SELECT * FROM sh_teachers WHERE id=?', [teacherId]);
    if (!saved) return err('Teacher saved but could not be retrieved.', 500);
    saved.subjects    = parseJsonField<string[]>(saved.subjects as unknown as string) ?? [];
    saved.admin_tasks = parseJsonField<string[]>(saved.admin_tasks as unknown as string) ?? [];
    saved.classes     = parseJsonField<string[]>(saved.classes as unknown as string) ?? (saved.class ? [saved.class] : []);
    delete (saved as { password?: string }).password;

    await rmsLog(existingRow ? 'UPDATE_TEACHER' : 'ADD_TEACHER', `Name: ${name}`, sid);

    const resp: Record<string, unknown> = {
      message: existingRow ? 'Teacher updated successfully.' : 'Teacher saved successfully.',
      teacher: saved,
    };
    if (!existingRow) {
      resp.employee_id = empId;
      resp.employee_id_note = 'The teacher uses this ID to log in.';
      if (generatedPw) {
        resp.generated_password = generatedPw;
        resp.password_note = 'Share this password with the teacher. They can change it after first login.';
      }
    }
    return ok(resp);
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    const msg = e instanceof Error && e.message.includes('Duplicate')
      ? 'Teacher with this name already exists in this school.' : 'Could not save teacher.';
    return err(msg, e instanceof Error && e.message.includes('Duplicate') ? 409 : 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    // Support id from query params (?id=N) OR request body
    const url  = new URL(req.url);
    const qId  = url.searchParams.get('id');
    let id: number;
    if (qId) {
      id = parseInt(qId, 10);
    } else {
      const body = await req.json().catch(() => ({}));
      id = parseInt(body.id ?? 0, 10);
    }
    if (!id) return err('Teacher ID required.');
    await execute('DELETE FROM sh_teachers WHERE id=? AND school_id=?', [id, sess.school_id]);
    await execute('DELETE FROM sh_auth WHERE teacher_id=?', [id]).catch(() => {});
    return ok({ message: 'Teacher deleted.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete teacher.', 500);
  }
}

// PATCH — lightweight approval/rejection update (does NOT touch any other fields)
export async function PATCH(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();
    const id   = parseInt(body.id ?? 0, 10);
    if (!id) return err('Teacher ID required.');

    const allowedStatuses = ['approved', 'rejected', 'pending'];
    if (body.approval_status && !allowedStatuses.includes(body.approval_status)) {
      return err('Invalid approval status.');
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    if (body.approval_status !== undefined) {
      fields.push('approval_status=?');
      params.push(body.approval_status);
    }
    if (body.rejection_reason !== undefined) {
      fields.push('rejection_reason=?');
      params.push(body.rejection_reason);
    }

    if (!fields.length) return err('Nothing to update.');
    params.push(id, sid);

    await execute(
      `UPDATE sh_teachers SET ${fields.join(',')} WHERE id=? AND school_id=?`,
      params
    );

    const saved = await queryOne<Teacher>('SELECT * FROM sh_teachers WHERE id=?', [id]);
    if (!saved) return err('Teacher not found after update.', 404);
    saved.subjects    = parseJsonField<string[]>(saved.subjects as unknown as string) ?? [];
    saved.admin_tasks = parseJsonField<string[]>(saved.admin_tasks as unknown as string) ?? [];
    saved.classes     = parseJsonField<string[]>(saved.classes as unknown as string) ?? (saved.class ? [saved.class] : []);
    delete (saved as { password?: string }).password;

    await rmsLog('APPROVE_TEACHER', `Status → ${body.approval_status} for teacher ${id}`, sid);
    return ok({ teacher: saved, message: `Teacher ${body.approval_status}.` });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not update teacher approval.', 500);
  }
}