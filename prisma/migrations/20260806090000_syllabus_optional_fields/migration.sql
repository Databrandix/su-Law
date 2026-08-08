-- Short title and summary are optional: a syllabus entry is really just
-- a titled PDF, and requiring both blocked admins from uploading one
-- without first writing copy for it. The public card falls back to
-- `title` and omits the summary paragraph when they are absent.
ALTER TABLE "syllabus" ALTER COLUMN "shortTitle" DROP NOT NULL;
ALTER TABLE "syllabus" ALTER COLUMN "summary" DROP NOT NULL;
