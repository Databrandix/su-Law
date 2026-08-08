-- The department layout is published as a downloadable card: cover
-- image + caption + PDF, matching the ProspectusEntry pattern. Cover
-- and PDF are nullable so the row exists before they are uploaded.
ALTER TABLE "about_department_layout" ADD COLUMN "cardTitle" TEXT NOT NULL DEFAULT 'Department Layout';
ALTER TABLE "about_department_layout" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "about_department_layout" ADD COLUMN "coverPublicId" TEXT;
ALTER TABLE "about_department_layout" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "about_department_layout" ADD COLUMN "pdfPublicId" TEXT;
ALTER TABLE "about_department_layout" ADD COLUMN "pdfFileName" TEXT;
