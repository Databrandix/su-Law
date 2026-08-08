-- Homepage hero copy moved from hardcoded JSX into DepartmentIdentity.
-- Defaults are '' so the existing row stays valid; the app falls back
-- to `name` when programName is blank.
ALTER TABLE "department_identity" ADD COLUMN     "programName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "programShortForm" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "programSubtitle" TEXT NOT NULL DEFAULT '';

-- Backfill the singleton with the copy that was previously hardcoded in
-- HeroSection.tsx, so the homepage renders unchanged after this runs.
UPDATE "department_identity"
SET "programName"      = 'Bachelor of Business Administration',
    "programShortForm" = 'BBA',
    "programSubtitle"  = 'Shaping engineers who design tomorrow''s machines, systems, and innovations.'
WHERE "id" = 'singleton';
