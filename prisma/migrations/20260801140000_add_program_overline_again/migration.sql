-- Re-add Program.overline. The label above each program image needs to
-- be per-program ("Undergraduate", "Postgraduate", …) now that the
-- section lists more than one level.
ALTER TABLE "program" ADD COLUMN "overline" TEXT NOT NULL DEFAULT '';

-- Backfill the existing program so the homepage renders unchanged.
UPDATE "program" SET "overline" = 'Undergraduate' WHERE "overline" = '';
