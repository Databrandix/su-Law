-- Add the campus room number to faculty contact details.
--
-- Nullable: only the Dean and Head have a room recorded today; the
-- rest are filled in from /admin/faculty as they are confirmed, and
-- the public profile omits the line while it is empty.
ALTER TABLE "faculty" ADD COLUMN "roomNo" TEXT;
