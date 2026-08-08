-- Social share image (Open Graph / Twitter card) for the department.
-- Nullable so existing rows keep working: the root layout falls back to
-- the bundled /assets/og-banner.webp when these are null.
ALTER TABLE "department_identity" ADD COLUMN "ogImageUrl" TEXT;
ALTER TABLE "department_identity" ADD COLUMN "ogImagePublicId" TEXT;
