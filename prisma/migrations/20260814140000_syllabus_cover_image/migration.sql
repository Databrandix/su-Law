-- Optional cover image for a syllabus.
--
-- The public card already shows a thumbnail: it asks Cloudinary for
-- page 1 of the stored PDF (`pg_1,f_jpg`). That stays the default, so
-- every existing row keeps the cover it has today and these columns
-- start null.
--
-- They exist as an override for the cases the derived thumbnail cannot
-- serve — a first page that is a bare title sheet, a scanned syllabus
-- whose page 1 renders poorly, or a designed cover the department
-- would rather show.
ALTER TABLE "syllabus" ADD COLUMN "coverUrl"      TEXT;
ALTER TABLE "syllabus" ADD COLUMN "coverPublicId" TEXT;
