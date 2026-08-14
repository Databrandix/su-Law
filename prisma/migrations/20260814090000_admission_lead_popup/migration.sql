-- Homepage admission-lead popup: singleton CMS + the leads it collects.
--
-- Two tables, mirroring the newsletter split (newsletter_page +
-- newsletter_subscriber): one row of editable configuration, one
-- growing table of submissions. Leads are DB-only — there is no email
-- leg — so the admission team works them from /admin/admission-leads.
--
-- Every copy column carries a DB-level default reproducing the
-- approved design, which lets the singleton be created with nothing
-- but its id and keeps schema.prisma and this file in agreement.
--
-- programmeOptions defaults to an empty array on purpose: the popup
-- falls back to the `program` table when the list is empty, so the
-- dropdown is correct before anyone opens the admin form.
CREATE TABLE "admission_lead_popup" (
    "id"                   TEXT NOT NULL DEFAULT 'singleton',
    "isEnabled"            BOOLEAN NOT NULL DEFAULT true,
    "delaySeconds"         INTEGER NOT NULL DEFAULT 15,
    "redisplayAfterHours"  INTEGER NOT NULL DEFAULT 24,
    "heading"              TEXT NOT NULL DEFAULT 'Start your journey with Sonargaon University',
    "subheading"           TEXT NOT NULL DEFAULT 'Get personalized admission guidance from our admission team.',
    "nameLabel"            TEXT NOT NULL DEFAULT 'Full name',
    "namePlaceholder"      TEXT NOT NULL DEFAULT 'As written on your certificate',
    "mobileLabel"          TEXT NOT NULL DEFAULT 'Mobile number',
    "mobilePlaceholder"    TEXT NOT NULL DEFAULT '01XXXXXXXXX',
    "programmeLabel"       TEXT NOT NULL DEFAULT 'Programme you are interested in',
    "programmePlaceholder" TEXT NOT NULL DEFAULT 'Choose a programme',
    "submitLabel"          TEXT NOT NULL DEFAULT 'Get admission guidance',
    "footerNote"           TEXT NOT NULL DEFAULT 'Our admission team will contact you shortly.',
    "programmeOptions"     JSONB NOT NULL DEFAULT '[]',
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_lead_popup_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton so the popup is live the moment this ships;
-- every column but updatedAt takes its default.
INSERT INTO "admission_lead_popup" ("id", "updatedAt")
VALUES ('singleton', CURRENT_TIMESTAMP);

CREATE TABLE "admission_lead" (
    "id"        TEXT NOT NULL,
    "fullName"  TEXT NOT NULL,
    "mobile"    TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'new',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_lead_pkey" PRIMARY KEY ("id")
);

-- Newest-first listing, and the status-filtered variant the admin
-- list uses when the team narrows to "new".
CREATE INDEX "admission_lead_createdAt_idx" ON "admission_lead"("createdAt");
CREATE INDEX "admission_lead_status_createdAt_idx" ON "admission_lead"("status", "createdAt");
