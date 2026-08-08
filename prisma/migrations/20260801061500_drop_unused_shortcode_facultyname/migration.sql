-- Drop DepartmentIdentity.shortCode and .facultyName.
--
-- Both were admin-editable but never read by any public page or
-- component — they only existed in the admin form, the Zod schema,
-- the server action, and the seed. Removing them so the Department
-- Identity form only shows fields that actually affect the site.
--
-- Destructive: the stored values ("ME" / "Faculty of Science &
-- Engineering") are gone after this runs. Nothing rendered them, so
-- there is no visible change.
ALTER TABLE "department_identity" DROP COLUMN "shortCode",
DROP COLUMN "facultyName";
