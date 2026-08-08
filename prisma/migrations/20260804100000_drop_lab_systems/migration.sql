-- Drop the two lab systems. The Business Administration department has
-- no laboratories, so the homepage section, both public pages, both
-- admin pages, and all four tables are removed.
--
-- Destructive: 10 Lab rows, 6 LaboratoryLab rows and the two landing
-- singletons are deleted permanently.
DROP TABLE IF EXISTS "lab";
DROP TABLE IF EXISTS "laboratory_lab";
DROP TABLE IF EXISTS "lab_facility_landing";
DROP TABLE IF EXISTS "laboratory_facility_landing";

-- Remove the nav entries that pointed at the deleted pages.
-- (page_hero has no rows for these two — they used their own landing
-- singletons rather than the generic per-page hero table.)
DELETE FROM "main_nav_item"
WHERE "href" IN ('/about/lab-facility', '/about/laboratory-facility');
