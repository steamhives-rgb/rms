-- Migration: add_result_score_schema
-- Stores per-school, per-class, per-term, per-type score component definitions.
-- E.g. CA1=20, CA2=20, Exam=60 for "JSS 1 / 1st Term / full"
--
-- Run this against your database after deploying the Result Component Builder.

CREATE TABLE IF NOT EXISTS sh_result_schemas (
  id          SERIAL        PRIMARY KEY,
  school_id   VARCHAR(16)   NOT NULL REFERENCES sh_schools(id) ON DELETE CASCADE,
  class       VARCHAR(64)   NOT NULL,
  term        VARCHAR(16)   NOT NULL,
  result_type VARCHAR(16)   NOT NULL DEFAULT 'full', -- 'full' | 'midterm'
  components  TEXT          NOT NULL,                -- JSON: ScoreComponent[]
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (school_id, class, term, result_type)
);

CREATE INDEX IF NOT EXISTS idx_result_schemas_school ON sh_result_schemas(school_id);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION trg_set_updated_at_result_schemas()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_result_schemas ON sh_result_schemas;
CREATE TRIGGER set_updated_at_result_schemas
  BEFORE UPDATE ON sh_result_schemas
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at_result_schemas();
