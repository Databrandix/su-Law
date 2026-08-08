-- Syllabus cards no longer show a cover image — the public list is a
-- text card (title, department, summary, download button), so the
-- required cover was blocking admins from uploading a syllabus PDF
-- without first sourcing artwork for it.
ALTER TABLE "syllabus" DROP COLUMN "coverUrl";
ALTER TABLE "syllabus" DROP COLUMN "coverPublicId";
