// POST /api/schools/upgrade — upgrade plan via coupon
import { NextRequest } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError, rmsLog } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const sess       = await authSchoolAdmin();
    const sid        = sess.school_id;
    const body       = await req.json();
    const couponCode = (body.coupon_code ?? '').trim().toUpperCase();
    if (!couponCode) return err('Upgrade coupon required.');

    const coupon = await queryOne<{ student_limit: number | null; plan_label: string }>(
      'SELECT * FROM sh_coupons WHERE code=? AND used=0',
      [couponCode]
    );
    if (!coupon) return err('Invalid or already-used upgrade coupon.');

    const school = await queryOne<{ name: string }>('SELECT name FROM sh_schools WHERE id=?', [sid]);

    await execute(
      'UPDATE sh_schools SET student_limit=?, plan_label=?, coupon_used=? WHERE id=?',
      [coupon.student_limit, coupon.plan_label, couponCode, sid]
    );
    await execute(
      'UPDATE sh_coupons SET used=true, used_by=?, used_by_name=?, used_date=NOW() WHERE code=?',
      [sid, school?.name ?? '', couponCode]
    );

    await rmsLog('UPGRADE_PLAN', `New plan: ${coupon.plan_label}`, sid);
    return ok({ message: 'Plan upgraded!', plan_label: coupon.plan_label, student_limit: coupon.student_limit });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not upgrade plan.', 500);
  }
}
