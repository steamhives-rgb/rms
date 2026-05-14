-- ─────────────────────────────────────────────────────────────────
-- Migration: Add sh_class_subjects table
-- Applies to: PostgreSQL (Neon / Supabase)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sh_class_subjects (
  id          SERIAL PRIMARY KEY,
  class_id    INTEGER      NOT NULL REFERENCES sh_school_classes(id) ON DELETE CASCADE,
  school_id   VARCHAR(20)  NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, name)
);

CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id   ON sh_class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_school_id  ON sh_class_subjects(school_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_class_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_class_subjects_updated_at ON sh_class_subjects;
CREATE TRIGGER trg_class_subjects_updated_at
  BEFORE UPDATE ON sh_class_subjects
  FOR EACH ROW EXECUTE FUNCTION update_class_subjects_updated_at();
