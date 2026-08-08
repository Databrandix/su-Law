-- Move the homepage department-introduction section into the CMS.
--
-- The seed row reproduces what OverviewSection.tsx rendered from
-- hardcoded JSX, so the public page is byte-identical until an admin
-- edits it in /admin/home-overview.
CREATE TABLE "home_overview" (
  "id"                   TEXT NOT NULL DEFAULT 'singleton',
  "heading"              TEXT NOT NULL,
  "body"                 TEXT NOT NULL,
  "imageUrl"             TEXT NOT NULL,
  "imagePublicId"        TEXT,
  "imageAlt"             TEXT NOT NULL DEFAULT '',
  "primaryCtaLabel"      TEXT NOT NULL,
  "primaryCtaHref"       TEXT NOT NULL,
  "primaryCtaExternal"   BOOLEAN NOT NULL DEFAULT false,
  "secondaryCtaLabel"    TEXT NOT NULL,
  "secondaryCtaHref"     TEXT NOT NULL,
  "secondaryCtaExternal" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "home_overview_pkey" PRIMARY KEY ("id")
);

INSERT INTO "home_overview" (
  "id", "heading", "body", "imageUrl", "imageAlt",
  "primaryCtaLabel", "primaryCtaHref",
  "secondaryCtaLabel", "secondaryCtaHref",
  "updatedAt"
) VALUES (
  'singleton',
  'Business Administration (BA)',
  'The Department of Business Administration is committed to developing future business leaders through quality education, innovation, and practical learning. With a strong emphasis on academic excellence, ethical values, and industry engagement, the department equips students with the knowledge, leadership, and problem-solving skills needed to succeed in today’s dynamic business environment and contribute meaningfully to society.',
  '/assets/overview-bba.webp',
  'Sonargaon University Business Administration students',
  'Explore More',      '/about/overview',
  'Dean''s Message',   '/about/deans-message',
  NOW()
);
