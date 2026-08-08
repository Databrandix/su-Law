-- /about/department-layout — the nav already linked here but no page
-- existed, so the link 404'd. Hero-only singleton for now; body content
-- is still to be decided and lands in `paragraphs` later.
CREATE TABLE "about_department_layout" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroTitle" TEXT NOT NULL,
    "heroOverline" TEXT,
    "heroImageUrl" TEXT NOT NULL,
    "heroImagePublicId" TEXT,
    "heroImageVerticalPercent" INTEGER NOT NULL DEFAULT 50,
    "paragraphs" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_department_layout_pkey" PRIMARY KEY ("id")
);

-- Same hero as /about/mission-vision, including its vertical framing.
INSERT INTO "about_department_layout"
    ("id", "heroTitle", "heroOverline", "heroImageUrl", "heroImageVerticalPercent", "paragraphs", "updatedAt")
VALUES
    ('singleton', 'Department Layout', 'About', '/assets/mission-vision-hero.webp', 3, '[]', NOW());
