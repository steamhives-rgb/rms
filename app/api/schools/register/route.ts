// POST /api/schools/register — register new school with coupon
import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { createSession, hashPassword, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';
import { PLANS } from '@/lib/constants';
import crypto from 'crypto';

async function generateSchoolId(abbr: string): Promise<string> {
  const ab = abbr.substring(0, 3).toUpperCase();
  let id: string;
  let tries = 0;
  do {
    id = ab + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const row = await queryOne<{ id: string }>('SELECT id FROM sh_schools WHERE id=?', [id]);
    if (!row) break;
  } while (++tries < 100);
  return id!;
}

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json();
    const couponCode = (body.coupon_code ?? '').trim().toUpperCase();
    const name       = (body.name ?? '').trim();
    const abbr       = (body.abbreviation ?? '').trim().toUpperCase();
    const password   = body.password ?? '';

    if (!couponCode || !name || !abbr || !password) return err('All fields are required.');
    if (abbr.length !== 3 || !/^[A-Z]+$/.test(abbr)) return err('Abbreviation must be exactly 3 letters.');
    if (password.length < 6) return err('Password must be at least 6 characters.');

    const coupon = await queryOne<{
      code: string; student_limit: number | null; plan_label: string;
    }>('SELECT * FROM sh_coupons WHERE code=? AND used=false', [couponCode]);
    if (!coupon) return err('Invalid or already-used coupon code.');

    const schoolId = await generateSchoolId(abbr);
    const hash     = await hashPassword(password);

    const schoolType    = ['primary','secondary','both'].includes(body.school_type) ? body.school_type : 'secondary';
    const namePrimary   = (body.name_primary ?? '').trim() || null;
    const nameSecondary = (body.name_secondary ?? '').trim() || null;
    const abbrPrimary   = (body.abbr_primary ?? '').trim().toUpperCase().substring(0, 3) || null;
    const abbrSecondary = (body.abbr_secondary ?? '').trim().toUpperCase().substring(0, 3) || null;
    const principalName = (body.principal_name ?? '').trim() || null;
    const headTeacher   = (body.head_teacher_name ?? '').trim() || null;

    await execute(
      `INSERT INTO sh_schools
         (id,name,abbreviation,password_hash,student_limit,plan_label,coupon_used,
          school_type,name_primary,name_secondary,abbr_primary,abbr_secondary,
          principal_name,head_teacher_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [schoolId, name, abbr, hash, coupon.student_limit, coupon.plan_label, couponCode,
       schoolType, namePrimary, nameSecondary, abbrPrimary, abbrSecondary, principalName, headTeacher]
    );

    await execute(
      'UPDATE sh_coupons SET used=true, used_by=?, used_by_name=?, used_date=NOW() WHERE code=?',
      [schoolId, name, couponCode]
    );

    const token = await createSession(schoolId);
    await rmsLog('REGISTER', `New school: ${name} (ID: ${schoolId})`, schoolId);

    const school = await queryOne(
      `SELECT id,name,abbreviation,student_limit,plan_label,motto,address,phone,email,
              color1,color2,school_logo,school_stamp,sig_principal,head_signature,
              school_type,name_primary,name_secondary,abbr_primary,abbr_secondary,
              principal_name,head_teacher_name,show_position,show_bf
       FROM sh_schools WHERE id=?`,
      [schoolId]
    );

    const response = NextResponse.json({ success: true, school_id: schoolId, token, school_name: name, school });
    response.cookies.set('rms_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (e) {
    console.error('[register]', e);
    const msg = e instanceof Error && e.message.includes('Duplicate')
      ? 'A school with this ID already exists. Try a different abbreviation.' : 'Registration failed.';
    return err(msg, 500);
  }
}