-- Co-authors on a research paper, so one paper is one row even when
-- several department members share it.
-- Shape: [{ "name": "...", "role": "...", "facultySlug": "..." }]
ALTER TABLE "research_paper" ADD COLUMN "coAuthors" JSONB;
