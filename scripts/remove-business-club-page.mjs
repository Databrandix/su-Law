/**
 * Phase 2a — reverts the club description and drops the About →
 * Business Club page's data.
 *
 * WHY THE DESCRIPTION IS REVERTED
 *   fix-ba-leftover-text.mjs rewrote "Representing the Department of
 *   Business Administration" to "…of Law". That was wrong: SU Business
 *   Club is one of fifteen university-wide clubs and genuinely belongs
 *   to the Business Administration department. The edit made the site
 *   claim a club it does not own, so the department's own wording goes
 *   back.
 *
 * WHY THE PAGE GOES
 *   /about/business-club is a whole page devoted to one club, which
 *   only exists because the template came from the BA department —
 *   there it was their flagship club. None of the other fourteen clubs
 *   has such a page. Law's own societies (Moot Court, Law Club) are
 *   already covered elsewhere, and the club itself stays listed at
 *   /student-society/club-list/business.
 *
 * The club row is NOT deleted — only the singleton that powered the
 * dedicated page.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const ORIGINAL = 'Representing the Department of Business Administration,';
const CURRENT = 'Representing the Department of Law,';

// ── 1. revert the club description ───────────────────────────────────
const club = await prisma.club.findUnique({ where: { slug: 'business' } });
if (!club) {
  console.error('No club with slug "business" — aborting.');
  await prisma.$disconnect();
  process.exit(1);
}

let revertTo = null;
if (club.description?.startsWith(CURRENT)) {
  revertTo = club.description.replace(CURRENT, ORIGINAL);
  console.log('Club description');
  console.log(`  from: ${club.description.slice(0, 92)}…`);
  console.log(`  to  : ${revertTo.slice(0, 92)}…`);
} else if (club.description?.startsWith(ORIGINAL)) {
  console.log('Club description — already the original wording, nothing to do.');
} else {
  console.log('Club description — unexpected wording, leaving untouched:');
  console.log(`  ${club.description?.slice(0, 92)}…`);
}

// ── 2. the About page singleton ──────────────────────────────────────
const about = await prisma.aboutBusinessClub.findUnique({ where: { id: 'singleton' } });
console.log(`\nAboutBusinessClub singleton: ${about ? `present ("${about.heroTitle}") — will delete` : 'absent'}`);

console.log('\nKept deliberately:');
console.log(`  · club "${club.name}" stays listed at /student-society/club-list/${club.slug}`);
console.log('  · /api/business-club/apply shim — serves browsers on a cached bundle');

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

if (revertTo) {
  await prisma.club.update({ where: { slug: 'business' }, data: { description: revertTo } });
  console.log('\nclub description reverted.');
}
if (about) {
  await prisma.aboutBusinessClub.delete({ where: { id: 'singleton' } });
  console.log('AboutBusinessClub singleton deleted.');
}
await prisma.$disconnect();
