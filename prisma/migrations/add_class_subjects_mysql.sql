-- ─────────────────────────────────────────────────────────────────
-- Migration: Add sh_class_subjects table
-- Applies to: MySQL / MariaDB
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `sh_class_subjects` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id`   INT UNSIGNED NOT NULL,
  `school_id`  VARCHAR(20)  NOT NULL,
  `name`       VARCHAR(150) NOT NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_class_subject`          (`class_id`, `name`),
  KEY         `idx_class_subjects_class` (`class_id`),
  KEY         `idx_class_subjects_school`(`school_id`),
  CONSTRAINT `fk_cs_class`  FOREIGN KEY (`class_id`)  REFERENCES `sh_school_classes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cs_school` FOREIGN KEY (`school_id`) REFERENCES `sh_schools`(`id`)        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
