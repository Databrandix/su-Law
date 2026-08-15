import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const n = await prisma.news.findUnique({ where: { slug: 'public-speaking-competition' } });
console.log('TITLE :', n.title);
console.log('SHORT :', n.shortTitle);
console.log('DATE  :', n.publishedAt.toISOString().slice(0,10));
console.log('SUMMARY:', n.summary);
console.log('BODY:');
for (const p of n.body) console.log('  -', p);
const e = await prisma.event.findUnique({ where: { slug: 'public-speaking' } });
if (e) {
  console.log('\n--- source event ---');
  console.log('title :', e.title);
  console.log('focus :', e.focus);
  console.log('venue :', e.venue, '| time:', e.time);
  for (const p of e.description) console.log('  -', p);
}
await prisma.$disconnect();
