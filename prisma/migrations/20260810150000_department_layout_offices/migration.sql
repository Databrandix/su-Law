-- The department layout page becomes a directory of offices — the same
-- shape the reference department publishes — rather than a bare PDF
-- download card.
--
-- deptName / address head the table; both nullable so the row can exist
-- before they are filled in.
--
-- offices is [{ name, level, highlight }]:
--   name      — office title, left column
--   level     — e.g. "Level 02" / "Ground Floor", right column
--   highlight — true for the department's own offices, which render in
--               the brand colour instead of plain grey
ALTER TABLE "about_department_layout" ADD COLUMN "deptName" TEXT;
ALTER TABLE "about_department_layout" ADD COLUMN "address"  TEXT;
ALTER TABLE "about_department_layout" ADD COLUMN "offices"  JSONB NOT NULL DEFAULT '[]';
