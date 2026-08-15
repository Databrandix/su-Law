import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
for (const n of await prisma.news.findMany({ orderBy: { publishedAt: 'desc' } })) {
  console.log(`\nslug=${n.slug}  [${n.category}]`);
  console.log(`  title      (${String(n.title).length} chars): ${n.title}`);
  console.log(`  shortTitle (${String(n.shortTitle).length} chars): ${n.shortTitle}`);
}
await prisma.$disconnect();
