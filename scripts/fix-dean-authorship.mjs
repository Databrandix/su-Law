/**
 * Restore "Digital Sovereignty in the Artificial Intelligence Era" to
 * its correct authorship: Md. Sagor Hossain, with Mst. Shirina Khatun
 * as co-author. Dr. A. S. M. Tariq Iqbal is NOT an author of this paper.
 *
 * Background: the department's publication spreadsheet lists this paper
 * on the "Tariq Iqbal" sheet as well as on Sagor Hossain's, which is
 * what raised the question. The citation on both sheets reads
 * "Md. Sagor Hossain & Mst. Shirina Khatun (2025)" — the dean's name
 * does not appear in it. The department has confirmed he was not part
 * of this paper; its presence on his sheet is a data-entry error.
 *
 * Mst. Shirina Khatun is not a department member, so she carries no
 * facultySlug and renders as plain text rather than a link.
 *
 * The dean's own paper — "The Paradox of Flexibility" — is a separate
 * row and is untouched here.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/fix-dean-authorship.mjs
 *   node --env-file=.env scripts/fix-dean-authorship.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const TITLE_FRAGMENT = 'Digital Sovereignty in the Artificial Intelligence Era';

const FIRST_AUTHOR = {
  authors: 'Md. Sagor Hossain',
  authorRole: 'Assistant Professor',
  facultySlug: 'md-sagor-hossain',
};

const CO_AUTHORS = [
  {
    // External to the department — no profile to link to.
    name: 'Mst. Shirina Khatun',
    role: null,
    facultySlug: null,
  },
];

try {
  const rows = await prisma.researchPaper.findMany({
    where: { title: { contains: TITLE_FRAGMENT } },
    orderBy: { displayOrder: 'asc' },
  });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  if (rows.length === 0) {
    console.log(`No row matches "${TITLE_FRAGMENT}" — nothing to do.`);
  } else if (rows.length > 1) {
    console.log(`!! ${rows.length} rows match — expected exactly 1. Aborting.`);
    for (const r of rows) console.log(`   [${r.displayOrder}] ${r.authors} — ${r.title}`);
  } else {
    const row = rows[0];

    console.log(`"${row.title}"\n`);
    console.log('BEFORE');
    console.log(`  author   : ${row.authors}  (${row.authorRole ?? '—'})`);
    console.log(`  co-auth  : ${JSON.stringify(row.coAuthors) ?? 'none'}`);

    console.log('\nAFTER');
    console.log(
      `  author   : ${FIRST_AUTHOR.authors}  (${FIRST_AUTHOR.authorRole})   ` +
        `→ /faculty-member/${FIRST_AUTHOR.facultySlug}`,
    );
    for (const c of CO_AUTHORS) {
      console.log(
        `  co-auth  : ${c.name}  (${c.role ?? '—'})   ` +
          `${c.facultySlug ? `→ /faculty-member/${c.facultySlug}` : '(no profile — plain text)'}`,
      );
    }

    if (COMMIT) {
      await prisma.researchPaper.update({
        where: { id: row.id },
        data: {
          authors: FIRST_AUTHOR.authors,
          authorRole: FIRST_AUTHOR.authorRole,
          facultySlug: FIRST_AUTHOR.facultySlug,
          coAuthors: CO_AUTHORS,
        },
      });
      console.log('\nUpdated 1 row.');
    }
  }
} finally {
  await prisma.$disconnect();
}
