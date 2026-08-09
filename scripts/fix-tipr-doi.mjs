/**
 * Correct the DOI on "Comparative Analysis of Intellectual Property
 * Laws of Bangladesh and India in the Age of Global Techno-Capitalism".
 *
 * The spreadsheet gives 10.69971/tipr.2.2.2024.34, which resolves to
 * 404. The publisher's article page — https://iprtrends.com/TIPR/article/view/38
 * — prints the registered DOI as 10.69971/tipr.2.2.2024.38 (verified:
 * resolves 200). A single digit was mistyped.
 *
 * Dry-run by default. Pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const WRONG = 'https://doi.org/10.69971/tipr.2.2.2024.34';
const RIGHT = 'https://doi.org/10.69971/tipr.2.2.2024.38';

try {
  const rows = await prisma.researchPaper.findMany({
    where: { link: WRONG },
    select: { id: true, title: true, authors: true, link: true },
  });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  if (rows.length === 0) {
    console.log('No row carries the broken DOI — nothing to do.');
  } else {
    for (const r of rows) {
      console.log(`"${r.title}"`);
      console.log(`  author: ${r.authors}`);
      console.log(`  before: ${r.link}   (404)`);
      console.log(`  after : ${RIGHT}   (200)\n`);
    }

    if (COMMIT) {
      const res = await prisma.researchPaper.updateMany({
        where: { link: WRONG },
        data: { link: RIGHT },
      });
      console.log(`Updated ${res.count} row(s).`);
    }
  }
} finally {
  await prisma.$disconnect();
}
