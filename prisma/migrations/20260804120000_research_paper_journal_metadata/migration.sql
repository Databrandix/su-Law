-- Journal metadata for research papers: publisher, indexing status,
-- quartile, citation metrics, and the faculty member's author position.
-- All nullable so existing rows stay valid.
ALTER TABLE "research_paper" ADD COLUMN "publisher" TEXT;
ALTER TABLE "research_paper" ADD COLUMN "indexing" TEXT;
ALTER TABLE "research_paper" ADD COLUMN "quartile" TEXT;
ALTER TABLE "research_paper" ADD COLUMN "metrics" TEXT;
ALTER TABLE "research_paper" ADD COLUMN "authorPosition" TEXT;
