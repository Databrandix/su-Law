-- Student Society → Service Charter.
--
-- Singleton, following the about_department_layout pattern: one row
-- with id='singleton' holding the page's hero, intro copy and the
-- downloadable charter PDF.
--
-- The office directory is deliberately NOT stored here. The
-- department's Service-Charter document was parsed and compared
-- row-by-row against about_department_layout.offices: identical office
-- names, identical levels, identical order, all 22 rows. Duplicating
-- that list would let the two pages drift apart, so this page reads it
-- from the existing record instead.
--
-- pdfUrl / pdfPublicId / pdfFileName are nullable so the row can exist
-- before the file is uploaded, matching how the layout card behaves.
CREATE TABLE "service_charter" (
    "id"                       TEXT NOT NULL DEFAULT 'singleton',
    "heroTitle"                TEXT NOT NULL DEFAULT 'Service Charter',
    "heroOverline"             TEXT,
    "heroImageUrl"             TEXT NOT NULL,
    "heroImagePublicId"        TEXT,
    "heroImageVerticalPercent" INTEGER NOT NULL DEFAULT 50,
    "paragraphs"               JSONB NOT NULL DEFAULT '[]',
    "cardTitle"                TEXT NOT NULL DEFAULT 'Service Charter',
    "coverUrl"                 TEXT,
    "coverPublicId"            TEXT,
    "pdfUrl"                   TEXT,
    "pdfPublicId"              TEXT,
    "pdfFileName"              TEXT,
    "updatedAt"                TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_charter_pkey" PRIMARY KEY ("id")
);
