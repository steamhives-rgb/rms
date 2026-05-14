// /api/admin/coupons — canonical alias for /api/dev/coupons
// GET  — list all coupons
// POST — generate new coupons
import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { authDev, AuthError, rmsLog } from '@/lib/auth';
import { ok, err, generateCouponCode } from '@/lib/utils';
import { PLANS } from '@/lib/constants';

export async function GET() {
  try {
    await authDev();
    // Fix: column is created_at, not generated_date
    const coupons = await query('SELECT * FROM sh_coupons ORDER BY created_at DESC');
    return ok({ coupons });
  } catch (e) {
    if (e instanceof AuthError) return err((e as AuthError).message, (e as AuthError).status);
    return err('Could not load coupons.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await authDev();
    const body = await req.json();
    const type = body.type ?? 'unlimited';
    const qty  = Math.max(1, Math.min(100, parseInt(body.qty ?? 1, 10)));

    const plan = PLANS[type] ?? PLANS['unlimited'];
    const generated: unknown[] = [];

    for (let i = 0; i < qty; i++) {
      const code = await generateCouponCode();
      // Fix: removed `type` column — it doesn't exist in sh_coupons schema
      await execute(
        `INSERT INTO sh_coupons (code, plan_label, student_limit)
         VALUES ($1, $2, $3)`,
        [code, plan.label, plan.limit]
      );
      generated.push({ code, type, planLabel: plan.label, studentLimit: plan.limit });
    }

    await rmsLog('DEV_GEN_COUPONS', `Type: ${type}, Qty: ${qty}`, null);
    return ok({ coupons: generated });
  } catch (e) {
    if (e instanceof AuthError) return err((e as AuthError).message, (e as AuthError).status);
    return err('Could not generate coupons.', 500);
  }
}