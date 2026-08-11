-- The department's own note about how a curriculum is to be read —
-- e.g. the LL.M lists more courses than its 36-credit requirement
-- because students select twelve of them.
--
-- Stored rather than derived so the wording is the department's, not a
-- sentence the page invents from the numbers.
ALTER TABLE "program" ADD COLUMN "curriculumNote" TEXT;
