-- Optional detail-page content for a club, mirroring the Business Club
-- page's sections. All nullable: a club with no introHeading keeps its
-- card-only behaviour and has no detail page.
ALTER TABLE "club"
  ADD COLUMN "heroTitle"                TEXT,
  ADD COLUMN "heroOverline"             TEXT,
  ADD COLUMN "heroImageUrl"             TEXT,
  ADD COLUMN "heroImagePublicId"        TEXT,
  ADD COLUMN "introOverline"            TEXT,
  ADD COLUMN "introHeading"             TEXT,
  ADD COLUMN "introBody1"               TEXT,
  ADD COLUMN "introBody2"               TEXT,
  ADD COLUMN "introImageUrl"            TEXT,
  ADD COLUMN "introImagePublicId"       TEXT,
  ADD COLUMN "stats"                    JSONB,
  ADD COLUMN "activities"               JSONB,
  ADD COLUMN "activitiesOverline"       TEXT,
  ADD COLUMN "activitiesHeading"        TEXT,
  ADD COLUMN "networkOverline"          TEXT,
  ADD COLUMN "networkHeading"           TEXT,
  ADD COLUMN "networkBody"              TEXT,
  ADD COLUMN "networkPrimaryCtaLabel"   TEXT,
  ADD COLUMN "networkPrimaryCtaHref"    TEXT,
  ADD COLUMN "networkSecondaryCtaLabel" TEXT,
  ADD COLUMN "networkSecondaryCtaHref"  TEXT;
