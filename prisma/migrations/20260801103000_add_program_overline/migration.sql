-- Per-program overline label ("Undergraduate", "Postgraduate", …)
-- shown above the program image on the homepage. Previously this was
-- parsed out of programName via a " — " separator, then briefly
-- hardcoded; neither worked once a second program existed.
ALTER TABLE "program" ADD COLUMN "overline" TEXT NOT NULL DEFAULT '';

-- Backfill the existing program so the homepage renders unchanged.
UPDATE "program" SET "overline" = 'Undergraduate' WHERE "overline" = '';
