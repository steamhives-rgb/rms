-- Teacher coupons: school-admin generated, single-use, for teacher self-registration
CREATE TABLE IF NOT EXISTS sh_teacher_coupons (
  id           SERIAL PRIMARY KEY,
  school_id    VARCHAR(16)  NOT NULL,
  code         VARCHAR(32)  NOT NULL UNIQUE,
  label        VARCHAR(128),                        -- optional note e.g. "For Mr. John"
  used         BOOLEAN      NOT NULL DEFAULT FALSE,
  used_by_id   INT,                                  -- sh_teachers.id
  used_by_name VARCHAR(128),
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,                         -- NULL = no expiry
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_tc_school FOREIGN KEY (school_id) REFERENCES sh_schools(school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tc_school ON sh_teacher_coupons(school_id);
CREATE INDEX IF NOT EXISTS idx_tc_code   ON sh_teacher_coupons(code);
