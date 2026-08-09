/**
 * Remove one duplicated publication from Sharmin Jahan Runa's list.
 *
 * Her source sheet lists "National Treatment for Combating Human
 * Trafficking" twice — once as a bare title (row 6) and again as a full
 * citation carrying its DOI (row 9). While titles held the whole
 * citation the two looked different; shortened to the title alone they
 * are plainly the same paper, listed twice under the same author.
 *
 * The row WITHOUT the DOI is deleted, keeping the more complete one.
 *
 * Two other repeated titles are deliberately left alone — they are
 * genuine co-authorship, one row per department author:
 *   · "Road Accident and Safety Issue…" — Runa + Sagor Hossain
 *   · "The Legal Status of River Rights…" — Ali + Chowdhury + Akter
 * Each faculty member's own page should list the paper they wrote.
 *
 * Dry-run by default. Pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const DUPLICATE_TITLE =
  'National Treatment for Combating Human Trafficking: A Comprehensive Study in Bangladesh';

try {
  const rows = await prisma.researchPaper.findMany({
    where: { title: DUPLICATE_TITLE },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, displayOrder: true, authors: true, link: true, publisher: true },
  });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');
  console.log(`"${DUPLICATE_TITLE}"\n`);

  if (rows.length < 2) {
    console.log(`Only ${rows.length} row(s) found — nothing to do.`);
  } else {
    // Same author on both rows, so the tie-break is completeness.
    const authorsDiffer = new Set(rows.map((r) => r.authors)).size > 1;
    if (authorsDiffer) {
      console.log('!! rows have different authors — this is co-authorship, not a duplicate. Aborting.');
    } else {
      const keep = rows.find((r) => r.link) ?? rows[0];
      const drop = rows.filter((r) => r.id !== keep.id);

      for (const r of rows) {
        const verdict = r.id === keep.id ? 'KEEP  ' : 'DELETE';
        console.log(`  ${verdict} [${r.displayOrder}] ${r.authors}`);
        console.log(`         link      : ${r.link ?? '— none'}`);
        console.log(`         publisher : ${r.publisher ?? '— none'}`);
      }

      if (COMMIT) {
        await prisma.researchPaper.deleteMany({ where: { id: { in: drop.map((d) => d.id) } } });
        const total = await prisma.researchPaper.count();
        console.log(`\nDeleted ${drop.length}. ResearchPaper rows now: ${total}`);
      }
    }
  }
} finally {
  await prisma.$disconnect();
}
