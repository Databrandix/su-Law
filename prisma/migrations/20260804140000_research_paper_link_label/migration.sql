-- Custom button text for a paper's link on /research. Nullable — the
-- page falls back to "View Publication" when it is not set.
ALTER TABLE "research_paper" ADD COLUMN "linkLabel" TEXT;
