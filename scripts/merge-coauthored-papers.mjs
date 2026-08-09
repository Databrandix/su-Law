/**
 * Collapse co-authored papers into a single row each.
 *
 * The import created one row per author, so a paper written by three
 * department members appeared three times on /research — inflating the
 * publication count and repeating the same title down the page.
 *
 * For each title held by more than one row this keeps the most complete
 * row (the one with a link, then a publisher) as the primary author,
 * moves the remaining authors into its `coAuthors` column, and deletes
 * their now-redundant rows.
 *
 * Author order follows the citation itself, not the database: the source
 * credits "Chowdhury, J., Ali, M., & Akhter, S." in that order, so
 * AUTHOR_ORDER below records it. Any author not listed there keeps its
 * existing relative position.
 *
 * Journal metadata is merged too — the department's own rows for the
 * same paper are unevenly filled (one carries the DOI, another the
 * publisher), so the surviving row takes the best value available for
 * each field rather than whatever its own row happened to hold.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/merge-coauthored-papers.mjs
 *   node --env-file=.env scripts/merge-coauthored-papers.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

// Citation author order, keyed by a fragment of the title. Names are
// matched loosely (surname), so spelling variants ("Akhter"/"Akter")
// still resolve.
const AUTHOR_ORDER = [
  {
    match: 'River Rights',
    order: ['chowdhury', 'ali', 'ak'], // Chowdhury, J., Ali, M., & Akhter, S.
  },
  {
    match: 'Road Accident',
    order: ['razzaque', 'runa', 'hossain'], // Razzaque, N., Runa, S. J. & Hossain M. S.
  },
];

try {
  const rows = await prisma.researchPaper.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  const byTitle = new Map();
  for (const r of rows) {
    const k = r.title.trim().toLowerCase();
    if (!byTitle.has(k)) byTitle.set(k, []);
    byTitle.get(k).push(r);
  }

  const merges = [];

  for (const [, list] of byTitle) {
    if (list.length < 2) continue;

    // Primary = the row carrying the most usable metadata, so nothing
    // is lost when the others are deleted.
    const score = (r) => (r.link ? 2 : 0) + (r.publisher ? 1 : 0);
    const ordered = [...list].sort((a, b) => score(b) - score(a) || a.displayOrder - b.displayOrder);
    const primary = ordered[0];

    // Order all authors by the citation where one is known.
    const rule = AUTHOR_ORDER.find((x) => primary.title.includes(x.match));
    const rank = (r) => {
      if (!rule) return 999;
      const n = r.authors.toLowerCase();
      const i = rule.order.findIndex((frag) => n.includes(frag));
      return i === -1 ? 999 : i;
    };
    const authorsInOrder = [...list].sort(
      (a, b) => rank(a) - rank(b) || a.displayOrder - b.displayOrder,
    );

    // Take the best value for each field across all the rows.
    const best = (field) => list.find((r) => r[field])?.[field] ?? null;

    merges.push({
      keepId: primary.id,
      // The row that survives should also carry the FIRST author of the
      // citation, which is not necessarily the best-populated row.
      first: authorsInOrder[0],
      coAuthors: authorsInOrder.slice(1).map((r) => ({
        name: r.authors,
        role: r.authorRole ?? null,
        facultySlug: r.facultySlug ?? null,
      })),
      deleteIds: list.filter((r) => r.id !== primary.id).map((r) => r.id),
      merged: {
        link: best('link'),
        publisher: best('publisher'),
        indexing: best('indexing'),
        date: best('date'),
        publicationYear: list.find((r) => r.publicationYear)?.publicationYear ?? null,
      },
      title: primary.title,
      displayOrder: Math.min(...list.map((r) => r.displayOrder)),
    });
  }

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  if (merges.length === 0) {
    console.log('No co-authored duplicates found.');
  }

  for (const m of merges) {
    console.log(`--- ${m.title}`);
    console.log(`    ${m.deleteIds.length + 1} rows → 1`);
    console.log(`    author  : ${m.first.authors}  (${m.first.authorRole ?? '—'})`);
    for (const c of m.coAuthors) {
      console.log(`    co-auth : ${c.name}  (${c.role ?? '—'})`);
    }
    console.log(`    link    : ${m.merged.link ?? '—'}`);
    console.log(`    publisher: ${m.merged.publisher ?? '—'}`);
    console.log(`    indexing : ${m.merged.indexing ?? '—'}`);
    console.log(`    year     : ${m.merged.publicationYear ?? '—'}\n`);
  }

  if (COMMIT && merges.length) {
    for (const m of merges) {
      await prisma.researchPaper.update({
        where: { id: m.keepId },
        data: {
          authors: m.first.authors,
          authorRole: m.first.authorRole,
          facultySlug: m.first.facultySlug,
          coAuthors: m.coAuthors,
          displayOrder: m.displayOrder,
          ...m.merged,
        },
      });
      await prisma.researchPaper.deleteMany({ where: { id: { in: m.deleteIds } } });
    }

    // Close the gaps left by the deleted rows.
    const remaining = await prisma.researchPaper.findMany({
      orderBy: { displayOrder: 'asc' },
      select: { id: true },
    });
    for (const [i, r] of remaining.entries()) {
      await prisma.researchPaper.update({ where: { id: r.id }, data: { displayOrder: i } });
    }

    console.log(`Merged ${merges.length} papers. ResearchPaper rows now: ${remaining.length}`);
  }
} finally {
  await prisma.$disconnect();
}
