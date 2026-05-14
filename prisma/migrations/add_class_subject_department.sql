-- Add department column to sh_class_subjects for SSS department-specific subjects
ALTER TABLE sh_class_subjects
  ADD COLUMN IF NOT EXISTS department VARCHAR(64) NULL DEFAULT NULL;

-- Index for efficient department filtering
CREATE INDEX IF NOT EXISTS idx_class_subjects_department
  ON sh_class_subjects (class_id, department);