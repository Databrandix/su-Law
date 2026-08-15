/**
 * Lengthen the Public Speaking news headline so it sits level with the
 * others in the News grid.
 *
 * The card renders `title`, and this one was the odd one out:
 *
 *   Public Speaking Competition 2026 ..................  32 chars (1 line)
 *   Tax Law as a profession: Opportunities, Trends ....  71 chars (2 lines)
 *   Career Prospect of Law Graduates: Evolving ........ 103 chars (2 lines)
 *   Bio-Psycho-Social and Spiritual Perspectives ...... 121 chars (3 lines)
 *
 * The replacement follows the same "Name: theme, theme and theme"
 * shape the other three already use, and every phrase in it is taken
 * from the article's own body text — confidence, critical thinking and
 * persuasive communication are named there — so nothing is invented to
 * pad the line out.
 *
 * `shortTitle` is deliberately untouched: it is the compact label used
 * where space is tight, and making that longer would defeat its purpose.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/expand-public-speaking-title.mjs
 *   node --env-file=.env scripts/expand-public-speaking-title.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const SLUG = 'public-speaking-competition';
const NEW_TITLE =
  'Public Speaking Competition 2026: Building Confidence, Critical Thinking and Persuasive Communication';

const prisma = new PrismaClient();

try {
  const row = await prisma.news.findUnique({ where: { slug: SLUG } });
  if (!row) throw new Error(`No news article with slug "${SLUG}".`);

  console.log(COMMIT ? '\n=== COMMIT ===\n' : '\n=== DRY RUN (pass --commit to write) ===\n');
  console.log(`before (${row.title.length} chars): ${row.title}`);
  console.log(`after  (${NEW_TITLE.length} chars): ${NEW_TITLE}`);
  console.log(`\nshortTitle unchanged: ${row.shortTitle}`);

  // Show the grid neighbours so the new length can be judged in context.
  const others = await prisma.news.findMany({
    where: { slug: { not: SLUG } },
    orderBy: { publishedAt: 'desc' },
    select: { title: true },
  });
  console.log('\nOther headlines for comparison:');
  for (const o of others) console.log(`   ${String(o.title.length).padStart(3)}  ${o.title}`);
  console.log();

  if (COMMIT) {
    await prisma.news.update({ where: { slug: SLUG }, data: { title: NEW_TITLE } });
    console.log('Title updated.');
  }
} finally {
  await prisma.$disconnect();
}
