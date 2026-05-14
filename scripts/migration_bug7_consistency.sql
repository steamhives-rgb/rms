-- ─────────────────────────────────────────────────────────────────
-- STEAMhives RMS — Database Consistency Migration
-- Bug 7 fixes: run once against your PostgreSQL database.
-- All statements are idempotent (safe to re-run).
-- ─────────────────────────────────────────────────────────────────

-- ── 7a. Remove duplicate sh_teacher_coupons definition ───────────
-- The second CREATE TABLE IF NOT EXISTS is silently ignored by Postgres,
-- but it's a maintenance hazard. Kept here as a comment to remind you
-- to clean database_complete.sql manually (lines ~390 region).
-- ACTION: Delete the second duplicate block in database_complete.sql.

-- ── 7b. Unique constraint on sh_subject_assignments ──────────────
-- Prevents duplicate rows for the same school/subject/class/term/session.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_subject_assignment'
  ) THEN
    ALTER TABLE sh_subject_assignments
      ADD CONSTRAINT uq_subject_assignment
      UNIQUE (school_id, subject_id, class, term, session);
  END IF;
END $$;

-- ── 7c. Make sh_attendance.term and session NOT NULL ─────────────
-- NULL term/session breaks the UNIQUE constraint and allows duplicate rows.
-- Set a safe default first, then enforce NOT NULL.
UPDATE sh_attendance SET term    = '' WHERE term    IS NULL;
UPDATE sh_attendance SET session = '' WHERE session IS NULL;

ALTER TABLE sh_attendance
  ALTER COLUMN term    SET NOT NULL,
  ALTER COLUMN term    SET DEFAULT '',
  ALTER COLUMN session SET NOT NULL,
  ALTER COLUMN session SET DEFAULT '';

-- ── 7d. FK from sh_results.student_id to sh_students ─────────────
-- Prevents orphaned result rows when students are deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_results_student'
  ) THEN
    ALTER TABLE sh_results
      ADD CONSTRAINT fk_results_student
      FOREIGN KEY (student_id) REFERENCES sh_students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 7e. Partial index for fast active-session lookup ─────────────
-- Speeds up every getActiveSession() call. Only indexes rows where is_current = TRUE.
CREATE INDEX IF NOT EXISTS idx_acad_sessions_current
  ON sh_acad_sessions(school_id, is_current)
  WHERE is_current = TRUE;

-- ── Additional: ensure current_week and attendance_weeks have sane defaults
ALTER TABLE sh_acad_sessions
  ALTER COLUMN current_week     SET DEFAULT 1,
  ALTER COLUMN attendance_weeks SET DEFAULT 14;

UPDATE sh_acad_sessions SET current_week     = 1  WHERE current_week     IS NULL;
UPDATE sh_acad_sessions SET attendance_weeks = 14 WHERE attendance_weeks IS NULL;
