// GET    /api/teachers/coupons         — list school's teacher coupons
// POST   /api/teachers/coupons         — generate new coupon(s)
// DELETE /api/teachers/coupons?id=N    — delete a coupon (unused only)
// GET    /api/teachers/coupons?verify=CODE — verify a coupon (public, for self-reg)

import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError } from '@/lib/auth';
import { ok, err, generateCouponCode } from '@/lib/utils';
import type { TeacherCoupon } from '@/lib/types';

export async function GET(req: NextRequest) {
  const verifyCode = req.nextUrl.searchParams.get('verify')?.toUpperCase().trim();

  // ── Public verify path (no auth needed) ──────────────────────────────────
  if (verifyCode) {
    try {
      const row = await queryOne<TeacherCoupon & { school_name: string; school_logo: string | null; school_motto: string | null }>(
        `SELECT c.*, s.name AS school_name, s.school_logo, s.motto AS school_motto
         FROM sh_teacher_coupons c
         JOIN sh_schools s ON s.id = c.school_id
         WHERE c.code = $1`,
        [verifyCode]
      );
      if (!row) return err('Invalid coupon code.', 404);
      if (row.used) return err('This coupon has already been used.');
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return err('This coupon has expired.');
      }
      return ok({
        valid: true,
        school_name:  row.school_name,
        school_logo:  row.school_logo ?? null,
        school_motto: row.school_motto ?? null,
        coupon: { code: row.code, label: row.label, school_id: row.school_id },
      });
    } catch (e) {
      console.error('[teacher-coupons GET verify]', e);
      return err('Could not verify coupon.', 500);
    }
  }

  // ── Authenticated list path ───────────────────────────────────────────────
  try {
    const sess    = await authSchoolAdmin();
    const coupons = await query<TeacherCoupon[]>(
      'SELECT * FROM sh_teacher_coupons WHERE school_id=$1 ORDER BY created_at DESC',
      [sess.school_id]
    );
    return ok({ coupons });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load coupons.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();

    const qty       = Math.max(1, Math.min(20, parseInt(body.qty ?? '1', 10)));
    const label     = (body.label ?? '').trim() || null;
    const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null;

    const generated: TeacherCoupon[] = [];

    for (let i = 0; i < qty; i++) {
      const code = await generateCouponCode();
      const row  = await queryOne<TeacherCoupon>(
        `INSERT INTO sh_teacher_coupons (school_id, code, label, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [sid, code, qty === 1 ? label : null, expiresAt]
      );
      if (row) generated.push(row);
    }

    return ok({ coupons: generated });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error('[teacher-coupons POST]', e);
    return err('Could not generate coupon.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const id   = parseInt(req.nextUrl.searchParams.get('id') ?? '0', 10);
    if (!id) return err('Coupon ID is required.');

    // Only allow deleting unused coupons belonging to this school
    const existing = await queryOne<{ used: boolean; school_id: string }>(
      'SELECT used, school_id FROM sh_teacher_coupons WHERE id=$1',
      [id]
    );
    if (!existing)                          return err('Coupon not found.', 404);
    if (existing.school_id !== sess.school_id) return err('Not authorised.', 403);
    if (existing.used)                      return err('Cannot delete a used coupon.');

    await execute('DELETE FROM sh_teacher_coupons WHERE id=$1', [id]);
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete coupon.', 500);
  }
}