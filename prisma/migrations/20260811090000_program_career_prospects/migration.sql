-- Career Prospects section on /programs/<slug>.
--
--   careerIntro  — Json string[] of paragraphs above the role list
--   careerRoles  — text[] of the individual roles a graduate can enter
--
-- Both default to empty, and the section only renders when at least one
-- is populated, so a programme without career copy is unaffected.
ALTER TABLE "program" ADD COLUMN "careerIntro" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "program" ADD COLUMN "careerRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
