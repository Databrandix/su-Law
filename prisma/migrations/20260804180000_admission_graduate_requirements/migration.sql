-- Add the Graduate Programs tier to the admission requirements
-- singleton. It renders between Undergraduate and Diploma.
--
-- Both columns default to an empty array so the existing row stays
-- valid and the new section simply doesn't render until content is
-- entered in /admin/admission-requirements.
ALTER TABLE "admission_requirements"
  ADD COLUMN "graduateRequirements" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "graduateNotes"        JSONB NOT NULL DEFAULT '[]';
