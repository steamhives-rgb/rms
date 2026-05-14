// GET | POST | DELETE /api/calendar
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { authSchool, authSchoolAdmin, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const sp   = req.nextUrl.searchParams;
    const month = sp.get('month'); // YYYY-MM
    const week  = sp.get('week');  // 'current'

    let rows;

    if (week === 'current') {
      // Return events for current Mon–Sun
      const now = new Date();
      const day = now.getDay(); // 0=Sun
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      rows = await query(
        `SELECT * FROM sh_calendar_events
         WHERE school_id=$1 AND event_date >= $2 AND event_date <= $3
         ORDER BY event_date ASC, id ASC`,
        [sid, fmt(mon), fmt(sun)]
      );
    } else if (month) {
      // YYYY-MM — return all events in that calendar month
      rows = await query(
        `SELECT * FROM sh_calendar_events
         WHERE school_id=$1 AND to_char(event_date,'YYYY-MM')=$2
         ORDER BY event_date ASC, id ASC`,
        [sid, month]
      );
    } else {
      rows = await query(
        `SELECT * FROM sh_calendar_events
         WHERE school_id=$1
         ORDER BY event_date ASC`,
        [sid]
      );
    }

    return ok({ events: rows });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not load calendar events.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const body = await req.json();

    // Bulk insert support
    if (Array.isArray(body.events)) {
      for (const ev of body.events) {
        const { event_date, title, type = 'school_day' } = ev;
        if (!event_date || !title) continue;
        await execute(
          `INSERT INTO sh_calendar_events (school_id, event_date, title, type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [sid, event_date, title, type]
        );
      }
      return ok({ message: 'Events created.' });
    }

    const { event_date, title, type = 'school_day' } = body;
    if (!event_date || !title) return err('event_date and title are required.');

    await execute(
      `INSERT INTO sh_calendar_events (school_id, event_date, title, type) VALUES ($1, $2, $3, $4)`,
      [sid, event_date, title, type]
    );

    return ok({ message: 'Event created.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not create event.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sess = await authSchoolAdmin();
    const sid  = sess.school_id;
    const id   = req.nextUrl.searchParams.get('id');
    if (!id) return err('Event id required.');

    await execute(
      'DELETE FROM sh_calendar_events WHERE id=$1 AND school_id=$2',
      [id, sid]
    );
    return ok({ message: 'Event deleted.' });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    return err('Could not delete event.', 500);
  }
}