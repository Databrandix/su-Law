-- Rename the Mecha Club tables to Business Club as part of the
-- Mechanical Engineering → Business Administration rebrand.
--
-- ALTER ... RENAME preserves all rows and indexes; nothing is dropped.
-- about_business_club keeps its single seeded row; the application
-- table is empty at time of writing but is renamed for consistency.
ALTER TABLE "about_mecha_club" RENAME TO "about_business_club";
ALTER TABLE "mecha_club_application" RENAME TO "business_club_application";

-- Indexes carry the old table name; rename them too so Prisma's
-- expected schema matches and no drift is reported later.
ALTER INDEX "about_mecha_club_pkey" RENAME TO "about_business_club_pkey";
ALTER INDEX "mecha_club_application_pkey" RENAME TO "business_club_application_pkey";
ALTER INDEX "mecha_club_application_status_submittedAt_idx" RENAME TO "business_club_application_status_submittedAt_idx";
ALTER INDEX "mecha_club_application_submittedAt_idx" RENAME TO "business_club_application_submittedAt_idx";

-- Point the public nav entry at the new route.
UPDATE "main_nav_item"
SET "name" = 'Business Club', "href" = '/about/business-club'
WHERE "href" = '/about/mecha-club';
