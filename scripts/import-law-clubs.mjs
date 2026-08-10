/**
 * Replace the inherited Business-Administration clubs with the Law
 * department's two societies, and drop the Business Club entry from the
 * Student Society nav.
 *
 * Content comes from the department's spreadsheet
 * "Student_Societies_and_CoCurricular_Template-1", sheet
 * "Societies_Clubs" — two rows, SUMCS and SULC. Names, purposes,
 * advisors, leads and links are transcribed from it; nothing is
 * invented.
 *
 * The Club model has no fields for advisor / president / email / founded
 * year, so those are folded into the description rather than dropped —
 * they are the details a prospective member actually needs.
 *
 * Images: Club.imageUrl is required, so both rows point at a bundled
 * placeholder. Replace them at /admin/clubs once the department supplies
 * photos.
 *
 * The /about/business-club route and its BusinessClubApplication table
 * are left in place — this only removes the nav entry that points at
 * them. That page has 0 applications, so nothing is lost either way.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/import-law-clubs.mjs
 *   node --env-file=.env scripts/import-law-clubs.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

// Both rows fall back to this until real photos are uploaded.
const PLACEHOLDER_IMAGE = '/assets/clubs/debate.webp';

const CLUBS = [
  {
    slug: 'moot-court-society',
    name: 'Sonargaon University Moot Court Society',
    abbreviation: 'SUMCS',
    description:
      'Promotes excellence in legal advocacy, research, writing, and professional ethics among law students. ' +
      'It organises training programmes, workshops, seminars, mock trials, and moot court competitions, ' +
      'preparing students for national and international advocacy competitions. ' +
      'Founded 2019 · Advisor: Md. Sagor Hossain, Assistant Professor of Law · ' +
      'President: Moriom Akhter Meem · sumcs.law.su@gmail.com',
  },
  {
    slug: 'law-club',
    name: 'Sonargaon University Law Club',
    abbreviation: 'SULC',
    description:
      'Promotes legal knowledge, academic excellence, and professional development among students. ' +
      'It enhances legal research, writing, advocacy, and leadership skills through seminars, workshops, ' +
      'debates, legal awareness programmes, and moot court activities. ' +
      'Founded 2025 · Advisors: All faculty members of the Department of Law · ' +
      'President: Kazi Abu Bokkor Jony · su.lawclub2015@gmail.com',
  },
];

try {
  const existingClubs = await prisma.club.findMany({
    orderBy: { displayOrder: 'asc' },
    select: { id: true, name: true, abbreviation: true },
  });

  const navItem = await prisma.mainNavItem.findFirst({
    where: { href: '/about/business-club' },
    include: { group: { select: { name: true } } },
  });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  console.log(`REMOVE ${existingClubs.length} Business Administration clubs:`);
  for (const c of existingClubs) console.log(`  · ${c.name} (${c.abbreviation})`);

  console.log(`\nADD ${CLUBS.length} Law societies:\n`);
  for (const c of CLUBS) {
    console.log(`  ${c.name} (${c.abbreviation})`);
    console.log(`    slug : /student-society/club-list#${c.slug}`);
    console.log(`    image: ${PLACEHOLDER_IMAGE}   (placeholder — upload at /admin/clubs)`);
    console.log(`    ${c.description}\n`);
  }

  console.log('NAV:');
  if (navItem) {
    console.log(`  REMOVE "${navItem.name}" from ${navItem.group.name} → ${navItem.href}`);
  } else {
    console.log('  no "/about/business-club" nav item found — nothing to remove');
  }

  if (COMMIT) {
    await prisma.$transaction([
      prisma.club.deleteMany({}),
      ...CLUBS.map((c, i) =>
        prisma.club.create({
          data: {
            slug: c.slug,
            name: c.name,
            abbreviation: c.abbreviation,
            description: c.description,
            imageUrl: PLACEHOLDER_IMAGE,
            displayOrder: i,
          },
        }),
      ),
      ...(navItem ? [prisma.mainNavItem.delete({ where: { id: navItem.id } })] : []),
    ]);

    const after = await prisma.club.count();
    console.log(`\nClubs now: ${after}. Nav entry ${navItem ? 'removed' : 'unchanged'}.`);
  }
} finally {
  await prisma.$disconnect();
}
