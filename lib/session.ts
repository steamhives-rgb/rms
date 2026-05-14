// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — Active Session Utility
// Single source of truth for the current academic session.
// All modules must use getActiveSession() — never accept manual input.
// ─────────────────────────────────────────────────────────────────
import { queryOne } from '@/lib/db';

export interface ActiveSession {
  id: number;
  label: string;            // "2025/2026"
  start_year: number;       // 2025
  end_year: number;         // 2026
  current_term: string;     // "1st Term" | "2nd Term" | "3rd Term"
  current_week: number;
  attendance_weeks: number;
  days_opened: number | null;
  next_term_begins: string | null;
  resumption_date: string | null;
}

export async function getActiveSession(schoolId: string): Promise<ActiveSession | null> {
  return queryOne<ActiveSession>(
    `SELECT id, label, start_year, end_year, current_term,
            current_week, attendance_weeks, days_opened,
            next_term_begins, resumption_date
     FROM sh_acad_sessions
     WHERE school_id = ? AND is_current = TRUE
     LIMIT 1`,
    [schoolId]
  );
}
