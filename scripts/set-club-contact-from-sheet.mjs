/**
 * Fills the contact strip on both society pages from
 * Student_Societies_and_CoCurricular_Template-1, sheet 1.
 *
 *   contactEmail <- column G, "Contact Email"
 *   contactPhone <- column H, "Contact Phone"
 *   SUMCS = row 2, SULC = row 3
 *
 * ONE FORMATTING NOTE, and nothing else is changed:
 * H2/H3 are stored as Excel *numbers*, so the leading zero of the
 * local mobile format is gone in the file — 1743431284, not
 * 01743431284. The digits below are exactly the sheet's; the country
 * code replaces that dropped zero, which is the standard Bangladeshi
 * rendering (0XXXXXXXXXX == +880XXXXXXXXXX). No digit is invented.
 *
 * contactHours is deliberately left null: the sheet records no office
 * hours for either society, and the /contact page's "Sat-Fri, 8 AM -
 * 8 PM" is the department's, not the clubs'.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

const CONTACT = {
  'moot-court-society': {
    contactHeading: 'Quick Contact Information',
    contactPhone:   '+880 1743-431284', // sheet1!H2 = 1743431284
    contactEmail:   'sumcs.law.su@gmail.com', // sheet1!G2
    contactHours:   null,
  },
  'law-club': {
    contactHeading: 'Quick Contact Information',
    contactPhone:   '+880 1611-233642', // sheet1!H3 = 1611233642
    contactEmail:   'su.lawclub2015@gmail.com', // sheet1!G3
    contactHours:   null,
  },
};

const p = new PrismaClient();

for (const [slug, data] of Object.entries(CONTACT)) {
  const club = await p.club.findUnique({ where: { slug }, select: { name: true } });
  if (!club) { console.log(`${slug}: NOT FOUND`); continue; }

  console.log(`\n${club.name}`);
  console.log(`  phone : ${data.contactPhone}`);
  console.log(`  e-mail: ${data.contactEmail}`);

  if (COMMIT) await p.club.update({ where: { slug }, data });
}

console.log(COMMIT ? '\nwritten.' : '\ndry run — pass --commit to apply.');
await p.$disconnect();
