-- Applications now come from more than one club, so each row records
-- which society the student applied to.
--
-- clubSlug is the join key back to `club`; it is intentionally NOT a
-- foreign key so deleting a club never destroys the applications people
-- already submitted to it. clubName is denormalized for the same
-- reason: the admin list must still be able to say what someone applied
-- to after the club row is gone or renamed.
--
-- Existing rows all came from the Business Club popup, which was the
-- only entry point before this change, so they are backfilled to that
-- club's actual row: slug 'business', name 'SU Business Club'.
ALTER TABLE "business_club_application" ADD COLUMN "clubSlug" TEXT;
ALTER TABLE "business_club_application" ADD COLUMN "clubName" TEXT;

UPDATE "business_club_application"
   SET "clubSlug" = 'business',
       "clubName" = 'SU Business Club'
 WHERE "clubSlug" IS NULL;

CREATE INDEX "business_club_application_clubSlug_submittedAt_idx"
    ON "business_club_application" ("clubSlug", "submittedAt");
