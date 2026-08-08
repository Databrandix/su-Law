-- Give each Program a dedicated detail page at /programs/<slug>.
--
-- `slug` addresses the route; `overviewParagraphs` holds the long-form
-- body that the homepage card's short description can't carry.
--
-- Both are optional so a program can exist as a homepage card only —
-- the card's CTA then falls back to its ctaHref as before.
ALTER TABLE "program"
  ADD COLUMN "slug"               TEXT,
  ADD COLUMN "overviewParagraphs" JSONB NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX "program_slug_key" ON "program"("slug");
