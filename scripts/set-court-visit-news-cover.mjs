/**
 * Gives the Court Visit news article its own photograph.
 *
 * The article used /assets/events-hero.webp — a template placeholder
 * showing a general auditorium audience, nothing to do with a court
 * visit. The story is about students observing proceedings at the
 * District & Sessions Judge Court, so the placeholder misrepresented it.
 *
 * NOTHING IS UPLOADED. The Court Visit event record already holds the
 * right photograph on the Law Cloudinary account — the one whose banner
 * reads "COURT VISIT — Journey of Practical Legal Knowledge, District &
 * Sessions Judge Court, Gazipur, organised by the 27th Batch,
 * Department of Law". The article points at that same asset, so the
 * news item and the event it describes cannot show different pictures.
 *
 * The write is refused unless the cover is exactly the known
 * placeholder, so a deliberately chosen picture is never overwritten
 * and re-running is a no-op.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const NEWS_SLUG = 'court-visit';
const EVENT_SLUG = 'court-visit';
const PLACEHOLDER = '/assets/events-hero.webp';

const prisma = new PrismaClient();

const article = await prisma.news.findUnique({ where: { slug: NEWS_SLUG } });
if (!article) {
  console.error(`No news article with slug "${NEWS_SLUG}".`);
  await prisma.$disconnect();
  process.exit(1);
}

const event = await prisma.event.findUnique({ where: { slug: EVENT_SLUG } });
if (!event?.imageUrl) {
  console.error(`No event "${EVENT_SLUG}" with an image to reuse.`);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`Article: ${article.title}`);
console.log(`  cover now : ${article.coverUrl}`);
console.log(`  cover new : ${event.imageUrl}`);
console.log(`  publicId  : ${event.imagePublicId}`);
console.log(`  source    : event "${event.title}"`);

if (article.coverUrl === event.imageUrl) {
  console.log('\nalready set — nothing to do.');
  await prisma.$disconnect();
  process.exit(0);
}
if (article.coverUrl !== PLACEHOLDER) {
  console.log(`\n!  cover is not the expected placeholder (${PLACEHOLDER}).`);
  console.log('   Refusing to overwrite a picture that was set deliberately.');
  await prisma.$disconnect();
  process.exit(1);
}

// The placeholder is shared; report what still uses it.
const others = await prisma.news.findMany({
  where: { coverUrl: PLACEHOLDER, slug: { not: NEWS_SLUG } },
  select: { slug: true },
});
console.log(
  `\n  other news still on the placeholder: ${others.length ? others.map((n) => n.slug).join(', ') : 'none'}`,
);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.news.update({
  where: { slug: NEWS_SLUG },
  data: { coverUrl: event.imageUrl, coverPublicId: event.imagePublicId },
});
console.log('\nwritten.');
await prisma.$disconnect();
