-- Make ProspectusEntry.level optional.
--
-- Entries that belong to neither the undergraduate nor the postgraduate
-- tier can now leave it blank: the public page hides the level pill for
-- those rows and keeps them out of the UG/PG filter tabs.
--
-- Existing rows keep their value — dropping NOT NULL never rewrites data.
ALTER TABLE "prospectus_entry" ALTER COLUMN "level" DROP NOT NULL;
