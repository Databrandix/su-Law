-- Contact strip above the footer on a club's detail page: the two
-- cards (phone, e-mail) mirroring the /contact page's quick-contact
-- template. All nullable — a club with neither value renders no strip.
--
-- contactHours is the small line under the phone number ("Sat-Fri,
-- 8 AM - 8 PM" on /contact); kept per club because a society's
-- availability is not the department's.
ALTER TABLE "club" ADD COLUMN "contactHeading" TEXT;
ALTER TABLE "club" ADD COLUMN "contactPhone"   TEXT;
ALTER TABLE "club" ADD COLUMN "contactHours"   TEXT;
ALTER TABLE "club" ADD COLUMN "contactEmail"   TEXT;
