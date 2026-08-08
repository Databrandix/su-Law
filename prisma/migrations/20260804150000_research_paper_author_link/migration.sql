-- Split the credited faculty member's designation out of `authors`, and
-- record which Faculty row the name belongs to so /research can link the
-- name to that profile. Both nullable — external authors have neither.
ALTER TABLE "research_paper" ADD COLUMN "authorRole" TEXT;
ALTER TABLE "research_paper" ADD COLUMN "facultySlug" TEXT;
