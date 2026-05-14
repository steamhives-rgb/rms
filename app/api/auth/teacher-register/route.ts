// POST /api/auth/teacher-register — teacher self-registration via coupon
import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPasswordFast, rmsLog } from '@/lib/auth';
import { err, nextEmployeeId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const couponCode = (body.coupon_code ?? '').toUpperCase().trim();
    const name       = (body.name ?? '').trim();
    const email      = (body.email ?? '').trim();
    const phone      = (body.phone ?? '').trim();
    const gender     = (body.gender ?? '').trim();
    const passport   = body.passport ?? null;
    const password   = (body.password ?? '').toString();

    if (!couponCode)  return NextResponse.json({ success: false, error: 'Coupon code is required.' }, { status: 400 });
    if (!name)        return NextResponse.json({ success: false, error: 'Full name is required.' }, { status: 400 });
    if (!email)       return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });

    // Verify coupon
    const coupon = await queryOne<{ id: number; school_id: string; used: boolean; expires_at: string | null; code: string }>(
      'SELECT * FROM sh_teacher_coupons WHERE code=$1',
      [couponCode]
    );
    if (!coupon) return NextResponse.json({ success: false, error: 'Invalid coupon code.' }, { status: 400 });
    if (coupon.used) return NextResponse.json({ success: false, error: 'This coupon has already been used.' }, { status: 400 });
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'This coupon has expired.' }, { status: 400 });
    }

    const sid = coupon.school_id;

    // Check duplicate email
    if (email) {
      const dup = await queryOne<{ id: number }>(
        'SELECT id FROM sh_teachers WHERE school_id=$1 AND email=$2',
        [sid, email]
      );
      if (dup) return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Generate employee_id
    const empId = await nextEmployeeId(sid);
    const pwHash = await hashPasswordFast(password);

    // Create teacher record
    const result = await queryOne<{ id: number }>(
      `INSERT INTO sh_teachers
         (school_id, name, email, phone, gender, avatar, employee_id, approval_status, self_registered)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',true)
       RETURNING id`,
      [sid, name, email, phone || null, gender || null, passport || null, empId]
    );
    if (!result) throw new Error('Failed to create teacher record.');
    const teacherId = result.id;

    // Create auth record
    await execute(
      'INSERT INTO sh_auth (school_id, teacher_id, email, password_hash, guard) VALUES ($1,$2,$3,$4,$5)',
      [sid, teacherId, email, pwHash, 'web']
    );

    // Mark coupon as used
    await execute('UPDATE sh_teacher_coupons SET used=true, used_at=NOW() WHERE id=$1', [coupon.id]).catch(() => {});

    // Insert notification for school
    await execute(
      `INSERT INTO sh_notifications (school_id, type, title, body, entity_id)
       VALUES ($1,'teacher_approval_pending',$2,$3,$4)`,
      [sid, 'New Teacher Registration', `${name} has registered and is awaiting approval.`, teacherId]
    ).catch(() => {});

    await rmsLog('TEACHER_SELF_REGISTER', `Teacher ${empId} self-registered`, sid);

    return NextResponse.json({
      success: true,
      employee_id: empId,
      message: 'Account created. Awaiting admin approval.',
    });
  } catch (e) {
    console.error('[teacher-register]', e);
    return NextResponse.json({ success: false, error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}