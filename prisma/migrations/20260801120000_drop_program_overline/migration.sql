-- Drop Program.overline. The label above each program image is now
-- hardcoded in ProgramsSection.tsx instead of being per-program.
--
-- Destructive: stored overline values are gone after this runs.
ALTER TABLE "program" DROP COLUMN "overline";
