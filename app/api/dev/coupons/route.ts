// POST /api/dev/coupons — generate coupons (dev)
import { NextRequest } from 'next/server';
import { execute } from '@/lib/db';
import { authDev, AuthError, rmsLog } from '@/lib/auth';
import { ok, err, generateCouponCode } from '@/lib/utils';
import { PLANS } from '@/lib/constants';

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
      await execute(
        'INSERT INTO sh_coupons (code,plan_label,student_limit) VALUES ($1,$2,$3)',
        [code, plan.label, plan.limit]
      );
      generated.push({ code, planLabel: plan.label, studentLimit: plan.limit });
    }

    await rmsLog('DEV_GEN_COUPONS', `Type: ${type}, Qty: ${qty}`, null);
    return ok({ coupons: generated });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not generate coupons.', 500);
  }
}