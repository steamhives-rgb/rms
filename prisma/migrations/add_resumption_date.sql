-- Add resumption_date to sh_acad_sessions
ALTER TABLE sh_acad_sessions
  ADD COLUMN IF NOT EXISTS resumption_date DATE,
  ADD COLUMN IF NOT EXISTS current_term    VARCHAR(32),
  ADD COLUMN IF NOT EXISTS attendance_weeks INT;