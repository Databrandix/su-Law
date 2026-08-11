-- Course Structure & Credit Distribution for /programs/<slug>.
--
-- `courses` is a Json array in the workbook's own row order:
--   [{ semester, code, title, credits, type }]
--
-- Kept as one Json column rather than a child table because the
-- curriculum is edited as a whole document (paste the whole programme
-- in, or nothing), never row-by-row, and the page always renders every
-- row grouped by semester.
--
-- Per-semester credit totals are derived from these rows at render
-- time, so they can never disagree with the course list.
--
-- The programme-level figures the department publishes separately
-- (total / core / project credits) live in their own columns.
ALTER TABLE "program" ADD COLUMN "courses" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "program" ADD COLUMN "totalCredits"   DOUBLE PRECISION;
ALTER TABLE "program" ADD COLUMN "coreCredits"    DOUBLE PRECISION;
ALTER TABLE "program" ADD COLUMN "projectCredits" DOUBLE PRECISION;
