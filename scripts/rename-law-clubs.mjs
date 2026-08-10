/**
 * Shorten the two Law societies' names to match how the department
 * refers to them, and to sit alongside the university's other clubs,
 * which all use the "SU …" prefix:
 *
 *   Sonargaon University Moot Court Society → SU Moot Court Society
 *   Sonargaon University Law Club           → SU Law Club
 *
 * Slugs are left alone so the club-list anchors and the nav links that
 * point at them keep working.
 *
 * Dry-run by default. Pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const RENAMES = [
  { slug: 'moot-court-society', name: 'SU Moot Court Society' },
  { slug: 'law-club',           name: 'SU Law Club' },
];

try {
  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  for (const r of RENAMES) {
    const club = await prisma.club.findUnique({
      where: { slug: r.slug },
      select: { id: true, name: true, abbreviation: true },
    });
    if (!club) {
      console.log(`!! no club with slug "${r.slug}" — skipped`);
      continue;
    }
    console.log(`  ${club.name}`);
    console.log(`    → ${r.name}  (${club.abbreviation})\n`);

    if (COMMIT) {
      await prisma.club.update({ where: { id: club.id }, data: { name: r.name } });
    }
  }

  if (COMMIT) console.log('Renamed. Re-run add-club-nav-children.mjs to update the nav labels.');
} finally {
  await prisma.$disconnect();
}
