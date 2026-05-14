-- Calendar events table
CREATE TABLE IF NOT EXISTS sh_calendar_events (
  id          SERIAL PRIMARY KEY,
  school_id   VARCHAR(16) NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  event_date  DATE        NOT NULL,
  title       VARCHAR(128) NOT NULL,
  type        VARCHAR(32)  NOT NULL DEFAULT 'school_day',
  -- types: school_day | holiday | midterm_test | exam | event | reminder
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_school ON sh_calendar_events(school_id);
CREATE INDEX IF NOT EXISTS idx_cal_date   ON sh_calendar_events(school_id, event_date);