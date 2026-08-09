import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const rows = await prisma.researchPaper.findMany({
  orderBy: { displayOrder: 'asc' },
  select: { id: true, displayOrder: true, title: true, authors: true, authorRole: true, facultySlug: true, link: true, publisher: true, indexing: true, publicationYear: true },
});
const byTitle = new Map();
for (const r of rows) {
  const k = r.title.toLowerCase();
  if (!byTitle.has(k)) byTitle.set(k, []);
  byTitle.get(k).push(r);
}
console.log(`total rows: ${rows.length}`);
for (const [, list] of byTitle) {
  if (list.length < 2) continue;
  console.log(`\n>>> ${list.length} rows: ${list[0].title}`);
  for (const r of list) {
    console.log(`   [${r.displayOrder}] ${r.authors}  |  ${r.authorRole ?? '—'}  |  slug=${r.facultySlug}`);
    console.log(`        pub=${r.publisher ?? '—'}  idx=${r.indexing ?? '—'}  link=${r.link ?? '—'}`);
  }
}
const uniq = [...byTitle.values()].length;
console.log(`\ndistinct titles: ${uniq}`);
await prisma.$disconnect();
