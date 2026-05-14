-- ═══════════════════════════════════════════════════════════════════════════
--  STEAMhives RMS — Complete PostgreSQL Schema (Fresh Install)
--  Database: PostgreSQL 14+  (Neon · Supabase · Railway · local)
--
--  This is the single authoritative schema file.
--  Run once on a clean database:
--    psql -h HOST -U USER -d DATABASE -f database.sql
--
--  All statements are idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────────
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ═══════════════════════════════════════════════════════════════════════════
--  1. sh_schools
--     One row per registered school / tenant.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_schools (
  id                       VARCHAR(16)   PRIMARY KEY,
  name                     VARCHAR(128)  NOT NULL,
  abbreviation             VARCHAR(16)   NOT NULL DEFAULT '',

  -- Contact
  email                    VARCHAR(128),
  phone                    VARCHAR(32),
  address                  TEXT,
  motto                    TEXT,

  -- School type & dual-school naming
  school_type              VARCHAR(16)   NOT NULL DEFAULT 'primary',
                                         -- 'primary' | 'secondary' | 'both'
  name_primary             VARCHAR(128),
  name_secondary           VARCHAR(128),
  abbr_primary             VARCHAR(32),
  abbr_secondary           VARCHAR(32),

  -- Staff names shown on report cards
  principal_name           VARCHAR(128),
  head_teacher_name        VARCHAR(128),

  -- Branding (all stored as base64 data-URLs)
  color1                   VARCHAR(16),
  color2                   VARCHAR(16),
  school_logo              TEXT,
  school_stamp             TEXT,
  sig_principal            TEXT,
  head_signature           TEXT,

  -- Subscription / limits
  student_limit            INT,
  plan_label               VARCHAR(32)   NOT NULL DEFAULT 'Free',
  coupon_used              VARCHAR(32),

  -- Feature flags
  show_position            BOOLEAN       NOT NULL DEFAULT FALSE,
  show_bf                  BOOLEAN       NOT NULL DEFAULT FALSE,
  default_attendance_weeks INT           NOT NULL DEFAULT 14,
  setup_completed          BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Auth
  password_hash            VARCHAR(255),

  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
--  2. sh_sessions  (server-side auth tokens)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_sessions (
  id         SERIAL       PRIMARY KEY,
  token      VARCHAR(64)  NOT NULL UNIQUE,
  school_id  VARCHAR(16)  NOT NULL,
  is_dev     BOOLEAN      NOT NULL DEFAULT FALSE,
  teacher_id INT,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token     ON sh_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_school_id ON sh_sessions(school_id);


-- ═══════════════════════════════════════════════════════════════════════════
--  3. sh_auth  (email + password credentials)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_auth (
  id            SERIAL       PRIMARY KEY,
  school_id     VARCHAR(16)  NOT NULL,
  teacher_id    INT          UNIQUE,
  email         VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  guard         VARCHAR(32)  NOT NULL DEFAULT 'web',
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_email      ON sh_auth(email);
CREATE INDEX IF NOT EXISTS idx_auth_school_id  ON sh_auth(school_id);
CREATE INDEX IF NOT EXISTS idx_auth_teacher_id ON sh_auth(teacher_id);


-- ═══════════════════════════════════════════════════════════════════════════
--  4. sh_password_resets
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_password_resets (
  id         SERIAL       PRIMARY KEY,
  email      VARCHAR(128) NOT NULL,
  token      VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  used       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON sh_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_pw_reset_email ON sh_password_resets(email);


-- ═══════════════════════════════════════════════════════════════════════════
--  5. sh_coupons  (system/admin-generated school-registration coupons)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_coupons (
  id            SERIAL       PRIMARY KEY,
  code          VARCHAR(32)  NOT NULL UNIQUE,
  plan_label    VARCHAR(32)  NOT NULL DEFAULT 'Free',
  student_limit INT,
  used          BOOLEAN      NOT NULL DEFAULT FALSE,
  used_by       VARCHAR(16),
  used_by_name  VARCHAR(128),
  used_date     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
--  6. sh_teachers
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_teachers (
  id               SERIAL       PRIMARY KEY,
  school_id        VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  name             VARCHAR(128) NOT NULL,
  employee_id      VARCHAR(32),

  -- Class assignment
  class            VARCHAR(64),           -- class-teacher's class
  classes          TEXT,                  -- JSON: string[]  (all classes taken)
  subjects         TEXT,                  -- JSON: { className: string[] }
  admin_tasks      TEXT,                  -- JSON: string[]  (permission keys)

  -- Role
  role             VARCHAR(32)  NOT NULL DEFAULT 'teaching',
                                          -- 'teaching' | 'non-teaching' | 'both'
  is_class_teacher BOOLEAN      NOT NULL DEFAULT FALSE,

  -- Personal info
  gender           VARCHAR(16),
  phone            VARCHAR(32),
  email            VARCHAR(128),
  dob              DATE,
  qualification    VARCHAR(128),
  specialisation   VARCHAR(128),
  hire_date        DATE,
  avatar           TEXT,                  -- base64
  signature        TEXT,                  -- base64
  address          TEXT,
  department       VARCHAR(64),
  staff_type       VARCHAR(64),

  -- Approval workflow
  approval_status  VARCHAR(16)  NOT NULL DEFAULT 'approved',
                                          -- 'approved' | 'pending' | 'rejected'
  self_registered  BOOLEAN      NOT NULL DEFAULT FALSE,
  rejection_reason TEXT,

  password         VARCHAR(255),

  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, employee_id),
  UNIQUE (school_id, email)
);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON sh_teachers(school_id);


-- ═══════════════════════════════════════════════════════════════════════════
--  7. sh_students
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_students (
  id             VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id      VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  adm            VARCHAR(32)  NOT NULL,
  name           VARCHAR(128) NOT NULL,
  gender         VARCHAR(16),
  dob            DATE,
  level          VARCHAR(32),
  class          VARCHAR(64)  NOT NULL,
  department     VARCHAR(64),
  arm            VARCHAR(32),
  term           VARCHAR(16)  NOT NULL DEFAULT '',
  session        VARCHAR(16)  NOT NULL DEFAULT '',
  house          VARCHAR(64),
  passport       TEXT,                    -- base64
  clubs          TEXT,                    -- JSON: string[]
  guardian_name  VARCHAR(128),
  guardian_phone VARCHAR(32),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, adm)
);
CREATE INDEX IF NOT EXISTS idx_students_school ON sh_students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class  ON sh_students(school_id, class);


-- ═══════════════════════════════════════════════════════════════════════════
--  8. sh_acad_sessions  (academic years / terms)
--
--  Bug 5 fix: current_week and attendance_weeks are NOT NULL with defaults.
--  Bug 7e fix: partial index on is_current for fast getActiveSession() lookups.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_acad_sessions (
  id               SERIAL       PRIMARY KEY,
  school_id        VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  label            VARCHAR(32)  NOT NULL,         -- "2025/2026"
  start_year       SMALLINT     NOT NULL,
  end_year         SMALLINT     NOT NULL,
  is_current       BOOLEAN      NOT NULL DEFAULT FALSE,
  days_opened      SMALLINT,
  next_term_begins DATE,
  resumption_date  DATE,
  current_term     VARCHAR(16),                   -- "1st Term" | "2nd Term" | "3rd Term"
  attendance_weeks INT          NOT NULL DEFAULT 14,
  current_week     INT          NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, label)
);
CREATE INDEX IF NOT EXISTS idx_acad_sessions_school ON sh_acad_sessions(school_id);

-- Bug 7e — partial index: only index the one row where is_current = TRUE per school
CREATE INDEX IF NOT EXISTS idx_acad_sessions_current
  ON sh_acad_sessions(school_id, is_current)
  WHERE is_current = TRUE;


-- ═══════════════════════════════════════════════════════════════════════════
--  9. sh_school_classes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_school_classes (
  id         SERIAL       PRIMARY KEY,
  school_id  VARCHAR(20)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  is_custom  BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, name)
);
CREATE INDEX IF NOT EXISTS idx_school_classes_school ON sh_school_classes(school_id);


-- ═══════════════════════════════════════════════════════════════════════════
--  10. sh_class_subjects
--
--  Bug 1 fix: class_id is INT FK to sh_school_classes — never a name string.
--  Subject assignment uses ON CONFLICT (class_id, name) for safe upserts.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_class_subjects (
  id         SERIAL       PRIMARY KEY,
  class_id   INT          NOT NULL REFERENCES sh_school_classes(id) ON DELETE CASCADE,
  school_id  VARCHAR(20)  NOT NULL REFERENCES sh_schools(id)        ON DELETE CASCADE,
  name       VARCHAR(150) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  department VARCHAR(64)  NULL     DEFAULT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (class_id, name)
);
CREATE INDEX IF NOT EXISTS idx_class_subjects_class      ON sh_class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_school     ON sh_class_subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_department ON sh_class_subjects(class_id, department);


-- ═══════════════════════════════════════════════════════════════════════════
--  11. sh_subjects  (school-level subject registry)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_subjects (
  id            SERIAL       PRIMARY KEY,
  school_id     VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  name          VARCHAR(128) NOT NULL,
  code          VARCHAR(32),
  description   TEXT,
  department    VARCHAR(64),
  is_compulsory BOOLEAN      NOT NULL DEFAULT TRUE,
  class_level   VARCHAR(64),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, name)
);


-- ═══════════════════════════════════════════════════════════════════════════
--  12. sh_subject_assignments
--
--  Bug 7b fix: unique constraint prevents duplicate rows for the same
--  school/subject/class/term/session combination.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_subject_assignments (
  id         SERIAL       PRIMARY KEY,
  school_id  VARCHAR(16)  NOT NULL,
  subject_id INT          NOT NULL REFERENCES sh_subjects(id) ON DELETE CASCADE,
  class      VARCHAR(64)  NOT NULL,
  teacher_id INT,
  term       VARCHAR(16)  NOT NULL,
  session    VARCHAR(16)  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_subject_assignment
    UNIQUE (school_id, subject_id, class, term, session)
);


-- ═══════════════════════════════════════════════════════════════════════════
--  13. sh_results
--
--  Bug 7d fix: student_id has FK to sh_students with ON DELETE CASCADE
--  so results are cleaned up when a student is deleted.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_results (
  id                VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id         VARCHAR(16)  NOT NULL REFERENCES sh_schools(id)  ON DELETE CASCADE,
  student_id        VARCHAR(36)  NOT NULL REFERENCES sh_students(id) ON DELETE CASCADE, -- Bug 7d
  student_adm       VARCHAR(32),
  student_name      VARCHAR(128),
  class             VARCHAR(64)  NOT NULL,
  term              VARCHAR(16)  NOT NULL,
  session           VARCHAR(16)  NOT NULL,
  result_type       VARCHAR(16)  NOT NULL DEFAULT 'full',
                                           -- 'full' | 'midterm'
  subjects          TEXT,                  -- JSON: SubjectResult[]
  overall_total     NUMERIC(8,2) NOT NULL DEFAULT 0,
  avg               NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade             VARCHAR(4)   NOT NULL DEFAULT '',
  position          INT,
  out_of            INT,
  affective         TEXT,                  -- JSON: AffectiveRecord
  teacher_name      VARCHAR(128),
  teacher_comment   TEXT,
  principal_comment TEXT,
  student_passport  TEXT,
  passport_img      TEXT,
  department        VARCHAR(64),
  teacher_signature TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, student_id, class, term, session, result_type)
);
CREATE INDEX IF NOT EXISTS idx_results_school     ON sh_results(school_id);
CREATE INDEX IF NOT EXISTS idx_results_class_term ON sh_results(school_id, class, term, session);


-- ═══════════════════════════════════════════════════════════════════════════
--  14. sh_pins  (result-viewing PINs distributed to parents)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_pins (
  id          SERIAL       PRIMARY KEY,
  school_id   VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  student_id  VARCHAR(36)  NOT NULL,
  pin         VARCHAR(16)  NOT NULL UNIQUE,
  result_type VARCHAR(16)  NOT NULL DEFAULT 'both',
                                     -- 'full' | 'midterm' | 'both'
  duration    VARCHAR(16)  NOT NULL DEFAULT 'session',
                                     -- 'session' | 'term'
  used        BOOLEAN      NOT NULL DEFAULT FALSE,
  used_at     TIMESTAMPTZ,
  revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pins_school  ON sh_pins(school_id);
CREATE INDEX IF NOT EXISTS idx_pins_student ON sh_pins(student_id);
CREATE INDEX IF NOT EXISTS idx_pins_pin     ON sh_pins(pin);


-- ═══════════════════════════════════════════════════════════════════════════
--  15. sh_attendance
--
--  Bug 7c fix: term and session are NOT NULL with empty-string defaults.
--  Without this, NULL values break the UNIQUE constraint and allow
--  duplicate rows per student/week.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_attendance (
  id         SERIAL       PRIMARY KEY,
  school_id  VARCHAR(16)  NOT NULL,
  student_id VARCHAR(36)  NOT NULL,
  class      VARCHAR(64),
  term       VARCHAR(16)  NOT NULL DEFAULT '',   -- Bug 7c: NOT NULL
  session    VARCHAR(16)  NOT NULL DEFAULT '',   -- Bug 7c: NOT NULL
  week_label VARCHAR(32),
  week_start DATE,
  days       TEXT,                               -- JSON: AttendanceDay[]
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, student_id, term, session, week_label)
);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON sh_attendance(school_id, class, term, session);


-- ═══════════════════════════════════════════════════════════════════════════
--  16. sh_teacher_coupons  (school-admin generated, for teacher self-reg)
--
--  Bug 7a fix: single definition with correct REFERENCES sh_schools(id) FK.
--  The old schema had two CREATE TABLE IF NOT EXISTS blocks; this is the
--  canonical one.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_teacher_coupons (
  id           SERIAL       PRIMARY KEY,
  school_id    VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  code         VARCHAR(32)  NOT NULL UNIQUE,
  label        VARCHAR(128),
  used         BOOLEAN      NOT NULL DEFAULT FALSE,
  used_by_id   INT,
  used_by_name VARCHAR(128),
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tc_school ON sh_teacher_coupons(school_id);
CREATE INDEX IF NOT EXISTS idx_tc_code   ON sh_teacher_coupons(code);


-- ═══════════════════════════════════════════════════════════════════════════
--  17. sh_notifications
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_notifications (
  id         SERIAL       PRIMARY KEY,
  school_id  VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  type       VARCHAR(64)  NOT NULL DEFAULT 'system',
                                    -- 'teacher_approval_pending' | 'teacher_approved'
                                    -- 'teacher_rejected' | 'student_registered'
                                    -- 'result_entered' | 'reminder' | 'system'
  title      VARCHAR(256) NOT NULL,
  body       TEXT,
  entity_id  INT,
  read       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifs_school ON sh_notifications(school_id, read);


-- ═══════════════════════════════════════════════════════════════════════════
--  18. sh_calendar_events
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_calendar_events (
  id              SERIAL       PRIMARY KEY,
  school_id       VARCHAR(16)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  event_date      DATE         NOT NULL,
  title           VARCHAR(256) NOT NULL,
  type            VARCHAR(32)  NOT NULL DEFAULT 'event',
                                         -- 'school_day' | 'holiday' | 'midterm_test'
                                         -- 'exam' | 'event' | 'reminder'
  weeks_in_term   INT,
  resumption_date DATE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cal_school ON sh_calendar_events(school_id, event_date);


-- ═══════════════════════════════════════════════════════════════════════════
--  19. sh_audit_log
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sh_audit_log (
  id         SERIAL       PRIMARY KEY,
  school_id  VARCHAR(16),
  action     VARCHAR(128) NOT NULL,
  details    TEXT,
  ip         VARCHAR(48),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_school ON sh_audit_log(school_id);


-- ═══════════════════════════════════════════════════════════════════════════
--  AUTO-UPDATE updated_at TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_schools_updated_at') THEN
    CREATE TRIGGER trg_schools_updated_at
      BEFORE UPDATE ON sh_schools
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_teachers_updated_at') THEN
    CREATE TRIGGER trg_teachers_updated_at
      BEFORE UPDATE ON sh_teachers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_students_updated_at') THEN
    CREATE TRIGGER trg_students_updated_at
      BEFORE UPDATE ON sh_students
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_results_updated_at') THEN
    CREATE TRIGGER trg_results_updated_at
      BEFORE UPDATE ON sh_results
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_class_subjects_updated_at') THEN
    CREATE TRIGGER trg_class_subjects_updated_at
      BEFORE UPDATE ON sh_class_subjects
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
--  DONE
--  Tables created (in dependency order):
--    1.  sh_schools
--    2.  sh_sessions
--    3.  sh_auth
--    4.  sh_password_resets
--    5.  sh_coupons
--    6.  sh_teachers
--    7.  sh_students
--    8.  sh_acad_sessions
--    9.  sh_school_classes
--    10. sh_class_subjects
--    11. sh_subjects
--    12. sh_subject_assignments
--    13. sh_results
--    14. sh_pins
--    15. sh_attendance
--    16. sh_teacher_coupons
--    17. sh_notifications
--    18. sh_calendar_events
--    19. sh_audit_log
-- ═══════════════════════════════════════════════════════════════════════════