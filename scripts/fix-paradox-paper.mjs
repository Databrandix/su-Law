/**
 * Correct authorship and DOI for "The Paradox of Flexibility".
 *
 * Both corrections were verified against the publisher's own article
 * page — https://legalresearchanalysis.com/LRA/article/view/133 — not
 * inferred from the spreadsheet:
 *
 *  1. AUTHOR ORDER. The paper credits "Joydeep Chowdhury" first and
 *     "A. S. M. Tariq Iqbal" second, both Department of Law, Sonargaon
 *     University. The row currently lists only the dean, so Chowdhury
 *     gets no credit and the order is reversed.
 *
 *  2. DOI. The spreadsheet gives 10.69971/lra.3.2.2025.1333, which
 *     resolves to 404 — a trailing digit was typed twice. The registered
 *     DOI is 10.69971/lra.3.2.2025.133 (verified: resolves 200).
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/fix-paradox-paper.mjs
 *   node --env-file=.env scripts/fix-paradox-paper.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const TITLE_FRAGMENT = 'Paradox of Flexibility';

const FIRST_AUTHOR = {
  authors: 'Joydeep Chowdhury',
  authorRole: 'Lecturer',
  facultySlug: 'joydeep-chowdhury',
};

const CO_AUTHORS = [
  {
    name: 'Dr. A. S. M. Tariq Iqbal',
    role: 'Professor & Dean',
    facultySlug: 'dr-a-s-m-tariq-iqbal',
  },
];

const CORRECT_DOI = 'https://doi.org/10.69971/lra.3.2.2025.133';

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
    console.log(`  author  : ${row.authors}  (${row.authorRole ?? '—'})`);
    console.log(`  co-auth : ${row.coAuthors ? JSON.stringify(row.coAuthors) : 'none'}`);
    console.log(`  link    : ${row.link ?? '—'}`);

    console.log('\nAFTER');
    console.log(
      `  author  : ${FIRST_AUTHOR.authors}  (${FIRST_AUTHOR.authorRole})   ` +
        `→ /faculty-member/${FIRST_AUTHOR.facultySlug}`,
    );
    for (const c of CO_AUTHORS) {
      console.log(
        `  co-auth : ${c.name}  (${c.role ?? '—'})   ` +
          `${c.facultySlug ? `→ /faculty-member/${c.facultySlug}` : '(no profile)'}`,
      );
    }
    console.log(`  link    : ${CORRECT_DOI}`);
    if (row.link && row.link !== CORRECT_DOI) {
      console.log(`            (was ${row.link} — resolves 404)`);
    }

    if (COMMIT) {
      await prisma.researchPaper.update({
        where: { id: row.id },
        data: {
          authors: FIRST_AUTHOR.authors,
          authorRole: FIRST_AUTHOR.authorRole,
          facultySlug: FIRST_AUTHOR.facultySlug,
          coAuthors: CO_AUTHORS,
          link: CORRECT_DOI,
        },
      });
      console.log('\nUpdated 1 row.');
    }
  }
} finally {
  await prisma.$disconnect();
}
