-- Add admin-controlled ordering to events.
--
-- Existing rows are backfilled in their current visible order
-- (eventDate DESC NULLS LAST, then createdAt DESC) so the public page
-- looks identical the moment this lands. From then on the chair can
-- drag any event to the top in /admin/events regardless of its date.
ALTER TABLE "event" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      ORDER BY "eventDate" DESC NULLS LAST, "createdAt" DESC
    ) - 1 AS position
  FROM "event"
)
UPDATE "event" e
SET "displayOrder" = ordered.position
FROM ordered
WHERE e."id" = ordered."id";

CREATE INDEX "event_displayOrder_idx" ON "event"("displayOrder");
