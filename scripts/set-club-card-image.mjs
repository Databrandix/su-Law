/**
 * Points a club's club-list card at the club's own photo.
 *
 *   node scripts/set-law-club-card-image.mjs <slug> [--commit]
 *
 * Several cards still use /assets/clubs/debate.webp, a template
 * placeholder, so those clubs are advertised on the club list with the
 * Debate Club's picture.
 *
 * NOTHING IS UPLOADED. The photo is already on the Law Cloudinary
 * account as the club's introImageUrl (the one shown on its detail
 * page), so the card is pointed at that same asset. One file, two
 * placements — the card cannot end up showing a different photo from
 * the page it links to.
 *
 * The write is refused unless the card currently holds exactly the
 * known placeholder, so a picture chosen deliberately is never
 * overwritten. `debate` keeps it: that is the club the image belongs
 * to.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const SLUG = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'law-club';
const PLACEHOLDER = '/assets/clubs/debate.webp';

const prisma = new PrismaClient();

const club = await prisma.club.findUnique({ where: { slug: SLUG } });
if (!club) {
  console.error(`No club with slug "${SLUG}".`);
  await prisma.$disconnect();
  process.exit(1);
}

if (!club.introImageUrl || !club.introImagePublicId) {
  console.error('This club has no introImageUrl/introImagePublicId to reuse. Aborting.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`Club: ${club.name} (${club.slug})\n`);
console.log(`  card image now : ${club.imageUrl}`);
console.log(`  card image new : ${club.introImageUrl}`);
console.log(`  publicId       : ${club.introImagePublicId}`);

if (club.imageUrl === club.introImageUrl) {
  console.log('\nalready set — nothing to do.');
  await prisma.$disconnect();
  process.exit(0);
}
if (club.imageUrl !== PLACEHOLDER) {
  console.log(`\n!  card image is not the expected placeholder (${PLACEHOLDER}).`);
  console.log('   Refusing to overwrite a picture that was set deliberately.');
  await prisma.$disconnect();
  process.exit(1);
}

// The placeholder is shared; confirm the others keep it.
const sharing = await prisma.club.findMany({
  where: { imageUrl: PLACEHOLDER, slug: { not: SLUG } },
  select: { slug: true },
});
console.log(`\n  still on the placeholder afterwards: ${sharing.map((c) => c.slug).join(', ')}`);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.club.update({
  where: { slug: SLUG },
  data: {
    imageUrl: club.introImageUrl,
    imagePublicId: club.introImagePublicId,
  },
});
console.log('\nwritten.');
await prisma.$disconnect();
