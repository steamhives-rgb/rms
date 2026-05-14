-- Notifications table
CREATE TABLE IF NOT EXISTS sh_notifications (
  id          SERIAL PRIMARY KEY,
  school_id   VARCHAR(16) NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  type        VARCHAR(64)  NOT NULL,
  -- types: teacher_approval_pending | teacher_approved | teacher_rejected |
  --        student_registered | result_entered | reminder | system
  title       VARCHAR(128) NOT NULL,
  body        TEXT,
  entity_id   INT,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_school ON sh_notifications(school_id);