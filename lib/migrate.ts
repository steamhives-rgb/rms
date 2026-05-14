// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — Database Migration Runner
// Run: npm run db:migrate
// Creates all tables, applies schema changes idempotently.
// ─────────────────────────────────────────────────────────────────
import { getPool } from './db';

async function migrate() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🚀 Running STEAMhives RMS migrations...');

    // ── sh_schools ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_schools (
        id                        VARCHAR(16)  PRIMARY KEY,
        name                      VARCHAR(128) NOT NULL,
        abbreviation              VARCHAR(16)  NOT NULL,
        email                     VARCHAR(128),
        phone                     VARCHAR(32),
        address                   TEXT,
        motto                     TEXT,
        school_type               VARCHAR(16)  NOT NULL DEFAULT 'primary',
        name_primary              VARCHAR(128),
        name_secondary            VARCHAR(128),
        abbr_primary              VARCHAR(16),
        abbr_secondary            VARCHAR(16),
        principal_name            VARCHAR(128),
        head_teacher_name         VARCHAR(128),
        color1                    VARCHAR(16),
        color2                    VARCHAR(16),
        school_logo               TEXT,
        school_stamp              TEXT,
        sig_principal             TEXT,
        head_signature            TEXT,
        student_limit             INT,
        plan_label                VARCHAR(32)  NOT NULL DEFAULT 'Free',
        coupon_used               VARCHAR(32),
        show_position             BOOLEAN      NOT NULL DEFAULT false,
        show_bf                   BOOLEAN      NOT NULL DEFAULT false,
        default_attendance_weeks  INT          NOT NULL DEFAULT 14,
        password_hash             VARCHAR(255),
        created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── sh_sessions ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_sessions (
        id         SERIAL      PRIMARY KEY,
        token      VARCHAR(64) NOT NULL UNIQUE,
        school_id  VARCHAR(16) NOT NULL,
        is_dev     BOOLEAN     NOT NULL DEFAULT false,
        teacher_id INT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sh_sessions(token)`);

    // ── sh_auth ──────────────────────────────────────────────────
    await client.query(`
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
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_email      ON sh_auth(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_school_id  ON sh_auth(school_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_teacher_id ON sh_auth(teacher_id)`);

    // ── sh_password_resets ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_password_resets (
        id         SERIAL       PRIMARY KEY,
        teacher_id INT,
        email      VARCHAR(128) NOT NULL,
        token      VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ  NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── sh_coupons ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_coupons (
        id             SERIAL      PRIMARY KEY,
        code           VARCHAR(32) NOT NULL UNIQUE,
        type           VARCHAR(32) NOT NULL,
        student_limit  INT,
        plan_label     VARCHAR(32) NOT NULL,
        used           BOOLEAN     NOT NULL DEFAULT false,
        used_by        VARCHAR(16),
        used_by_name   VARCHAR(128),
        used_date      TIMESTAMPTZ,
        generated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── sh_teachers ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_teachers (
        id               SERIAL      PRIMARY KEY,
        school_id        VARCHAR(16) NOT NULL,
        name             VARCHAR(128) NOT NULL,
        employee_id      VARCHAR(32),
        email            VARCHAR(128),
        phone            VARCHAR(32),
        gender           VARCHAR(16),
        dob              DATE,
        class            VARCHAR(64),
        classes          TEXT,
        subjects         TEXT,
        admin_tasks      TEXT,
        role             VARCHAR(32) NOT NULL DEFAULT 'both',
        is_class_teacher BOOLEAN     NOT NULL DEFAULT false,
        qualification    VARCHAR(128),
        specialisation   VARCHAR(128),
        hire_date        DATE,
        avatar           TEXT,
        signature        TEXT,
        address          TEXT,
        department       VARCHAR(64),
        staff_type       VARCHAR(32),
        approval_status  VARCHAR(32) NOT NULL DEFAULT 'approved',
        self_registered  BOOLEAN     NOT NULL DEFAULT false,
        rejection_reason TEXT,
        password         VARCHAR(255),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, employee_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_teachers_school ON sh_teachers(school_id)`);

    // ── sh_students ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_students (
        id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        school_id  VARCHAR(16) NOT NULL,
        adm        VARCHAR(64) NOT NULL,
        name       VARCHAR(128) NOT NULL,
        gender     VARCHAR(16),
        dob        DATE,
        level      VARCHAR(64),
        class      VARCHAR(64) NOT NULL,
        department VARCHAR(64),
        arm        VARCHAR(32),
        term       VARCHAR(16) NOT NULL,
        session    VARCHAR(16) NOT NULL,
        house      VARCHAR(64),
        passport   TEXT,
        clubs      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, adm)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_school ON sh_students(school_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_class  ON sh_students(school_id, class)`);

    // ── sh_results ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_results (
        id                VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        school_id         VARCHAR(16)  NOT NULL,
        student_id        VARCHAR(36),
        student_adm       VARCHAR(64),
        student_name      VARCHAR(128),
        class             VARCHAR(64)  NOT NULL,
        term              VARCHAR(16)  NOT NULL,
        session           VARCHAR(16)  NOT NULL,
        result_type       VARCHAR(16)  NOT NULL DEFAULT 'full',
        subjects          TEXT,
        overall_total     NUMERIC(6,2) NOT NULL DEFAULT 0,
        avg               NUMERIC(5,2) NOT NULL DEFAULT 0,
        grade             VARCHAR(4),
        position          INT,
        out_of            INT,
        affective         TEXT,
        teacher_name      VARCHAR(128),
        teacher_comment   TEXT,
        principal_comment TEXT,
        student_passport  TEXT,
        department        VARCHAR(64),
        teacher_signature TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_results_school ON sh_results(school_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_results_student ON sh_results(school_id, student_id)`);

    // ── sh_pins ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_pins (
        id          SERIAL      PRIMARY KEY,
        school_id   VARCHAR(16) NOT NULL,
        student_id  VARCHAR(36),
        pin         VARCHAR(32) NOT NULL UNIQUE,
        result_type VARCHAR(16) NOT NULL DEFAULT 'full',
        duration    VARCHAR(16) NOT NULL DEFAULT 'term',
        used        BOOLEAN     NOT NULL DEFAULT false,
        used_at     TIMESTAMPTZ,
        revoked     BOOLEAN     NOT NULL DEFAULT false,
        expires_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── sh_acad_sessions ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_acad_sessions (
        id                SERIAL      PRIMARY KEY,
        school_id         VARCHAR(16),
        label             VARCHAR(16) NOT NULL,
        start_year        INT         NOT NULL,
        end_year          INT         NOT NULL,
        is_current        BOOLEAN     NOT NULL DEFAULT false,
        days_opened       INT,
        next_term_begins  DATE,
        current_term      VARCHAR(16),
        attendance_weeks  INT         NOT NULL DEFAULT 14,
        current_week      INT         NOT NULL DEFAULT 1,
        default_weeks     INT                  DEFAULT 14,
        school_days       INT                  DEFAULT 180,
        next_term_start   DATE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── sh_attendance ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_attendance (
        id          SERIAL       PRIMARY KEY,
        school_id   VARCHAR(16)  NOT NULL,
        student_id  VARCHAR(36)  NOT NULL,
        class       VARCHAR(64)  NOT NULL,
        term        VARCHAR(16)  NOT NULL,
        session     VARCHAR(16)  NOT NULL,
        week_label  VARCHAR(32)  NOT NULL,
        week_start  DATE,
        days        TEXT,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, student_id, term, session, week_label)
      )
    `);

    // ── sh_subjects ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_subjects (
        id            SERIAL       PRIMARY KEY,
        school_id     VARCHAR(16)  NOT NULL,
        name          VARCHAR(128) NOT NULL,
        code          VARCHAR(16),
        description   TEXT,
        department    VARCHAR(64),
        is_compulsory BOOLEAN      NOT NULL DEFAULT true,
        class_level   VARCHAR(32),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, name)
      )
    `);

    // ── sh_subject_assignments ───────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_subject_assignments (
        id          SERIAL      PRIMARY KEY,
        school_id   VARCHAR(16) NOT NULL,
        subject_id  INT         NOT NULL,
        class       VARCHAR(64) NOT NULL,
        teacher_id  INT,
        term        VARCHAR(16) NOT NULL,
        session     VARCHAR(16) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, subject_id, class, term, session)
      )
    `);

    // ── sh_audit_log ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_audit_log (
        id         SERIAL       PRIMARY KEY,
        school_id  VARCHAR(16),
        action     VARCHAR(128) NOT NULL,
        details    TEXT,
        ip         VARCHAR(45),
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✅ All migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
