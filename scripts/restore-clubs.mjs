/**
 * Restore the 13 university-wide clubs from the original BA database and
 * re-add the two Law societies alongside them.
 *
 * Context: an earlier pass replaced the whole Club table with the two
 * Law societies. The intent was to ADD them, keeping the university's
 * existing clubs — /student-society/club-list is meant to list them all.
 *
 * The old database is read ONLY (a single SELECT). Nothing is written to
 * it; every write below targets the current department's database.
 *
 * The Law societies come from the department's spreadsheet
 * "Student_Societies_and_CoCurricular_Template-1", sheet
 * "Societies_Clubs". They are ordered first so the department's own
 * societies lead the page, with the university-wide clubs after.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/restore-clubs.mjs
 *   node --env-file=.env scripts/restore-clubs.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

// Read-only connection to the original BA database.
const OLD_DB =
  'postgresql://neondb_owner:npg_FvpbxkVw86Tm@ep-lively-block-ax5epr71-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const PLACEHOLDER_IMAGE = '/assets/clubs/debate.webp';

const LAW_SOCIETIES = [
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
    imageUrl: PLACEHOLDER_IMAGE,
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
    imageUrl: PLACEHOLDER_IMAGE,
  },
];

const prisma = new PrismaClient();
// Second Prisma client pointed at the old database — same schema, so no
// extra driver is needed. Used for one SELECT and nothing else.
const oldDb = new PrismaClient({ datasources: { db: { url: OLD_DB } } });

try {
  const original = await oldDb.club.findMany({
    orderBy: { displayOrder: 'asc' },
    select: {
      slug: true, name: true, abbreviation: true, description: true,
      imageUrl: true, imagePublicId: true, displayOrder: true,
    },
  });

  const current = await prisma.club.findMany({
    orderBy: { displayOrder: 'asc' },
    select: { slug: true, name: true },
  });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');
  console.log(`Old BA database (read-only): ${original.length} clubs found`);
  console.log(`This database currently holds: ${current.length}`);
  for (const c of current) console.log(`    · ${c.name}`);

  // Law societies first, then the university-wide clubs in their
  // original order. Any Law society already present is replaced rather
  // than duplicated, so re-running is safe.
  const lawSlugs = new Set(LAW_SOCIETIES.map((c) => c.slug));
  const restored = original.filter((c) => !lawSlugs.has(c.slug));

  const final = [
    ...LAW_SOCIETIES.map((c) => ({ ...c, imagePublicId: null })),
    ...restored.map((c) => ({
      slug: c.slug,
      name: c.name,
      abbreviation: c.abbreviation,
      description: c.description,
      imageUrl: c.imageUrl,
      imagePublicId: c.imagePublicId,
    })),
  ];

  console.log(`\nAFTER (${final.length} clubs):\n`);
  for (const [i, c] of final.entries()) {
    const tag = lawSlugs.has(c.slug) ? '  [Law society]' : '';
    console.log(`  ${String(i + 1).padStart(2)}. ${c.name} (${c.abbreviation})${tag}`);
    console.log(`      ${c.description.slice(0, 100)}${c.description.length > 100 ? '…' : ''}`);
  }

  if (COMMIT) {
    await prisma.$transaction([
      prisma.club.deleteMany({}),
      ...final.map((c, i) => prisma.club.create({ data: { ...c, displayOrder: i } })),
    ]);
    console.log(`\nClubs now: ${await prisma.club.count()}`);
  }
} finally {
  await oldDb.$disconnect();
  await prisma.$disconnect();
}
