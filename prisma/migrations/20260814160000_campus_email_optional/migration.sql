-- Make the campus e-mail optional.
--
-- `phone` on this table has always been nullable; `email` was not, so a
-- campus could not be published without one. Removing an address meant
-- substituting a different one, which invents contact details.
--
-- Existing rows keep their values — this only widens the column, so it
-- is safe to run against live data and needs no backfill.
ALTER TABLE "campus_location" ALTER COLUMN "email" DROP NOT NULL;
