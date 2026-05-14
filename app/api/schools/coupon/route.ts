// GET /api/schools/coupon?code=XXX — verify coupon
// POST /api/schools/coupon — (dev only) generate coupons
import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { ok, err } from '@/lib/utils';
import type { Coupon } from '@/lib/types';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim();
  if (!code) return err('Coupon code is required.');

  try {
    const coupon = await queryOne<Coupon>('SELECT * FROM sh_coupons WHERE code=?', [code]);
    if (!coupon) return err('Invalid coupon code.');
    if (coupon.used) return err('This coupon has already been used.');

    return ok({
      coupon,
      student_limit: coupon.student_limit,
      plan_label: coupon.plan_label,
    });
  } catch (e) {
    console.error('[coupon GET]', e);
    return err('Could not verify coupon.', 500);
  }
}
