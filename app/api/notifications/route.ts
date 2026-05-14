// GET | PUT | DELETE /api/notifications
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sess = await authSchoolAdmin();
    const notifications = await query(
      `SELECT * FROM sh_notifications WHERE school_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [sess.school_id]
    );
    return ok({ notifications });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load notifications.', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const sp   = req.nextUrl.searchParams;

    if (sp.get('all') === 'true') {
      await execute('UPDATE sh_notifications SET read=true WHERE school_id=$1', [sid]);
      return ok({ message: 'All marked read.' });
    }

    const id = sp.get('id');
    if (!id) return err('id or all=true required.');
    await execute('UPDATE sh_notifications SET read=true WHERE id=$1 AND school_id=$2', [id, sid]);
    return ok({ message: 'Marked read.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not update notification.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const id   = req.nextUrl.searchParams.get('id');
    if (!id) return err('id required.');
    await execute('DELETE FROM sh_notifications WHERE id=$1 AND school_id=$2', [id, sid]);
    return ok({ message: 'Deleted.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete notification.', 500);
  }
}