/**
 * Shifts the Message-from-Head hero image down so the faces are fully
 * visible instead of being cut off at the top.
 *
 * The hero is a fixed-height band with the photo cropped to fill it,
 * and objectPosition decides which slice survives. The source is a
 * 2048x1011 convocation photo whose row of academics sits in the upper
 * third; at "center 50%" the band clipped the tops of their caps.
 *
 * DIRECTION: objectPosition's percentage aligns the same point of the
 * image with that point of the box, so a HIGHER value pulls the picture
 * DOWN through the frame. 50% -> 65% lowers it enough to clear the
 * caps while keeping the faces inside the band.
 *
 * ONLY the crop position changes. No layout, height, overlay or styling
 * is touched, and the value is per-record — other pages sharing this
 * same fallback image keep their own framing.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
// Overridable so the crop can be re-tuned by eye without editing this
// file: node scripts/fix-head-message-hero-crop.mjs 70 --commit
const arg = process.argv.slice(2).find((a) => /^\d+$/.test(a));
const NEW_PERCENT = arg ? Number(arg) : 65;

const prisma = new PrismaClient();

const head = await prisma.faculty.findFirst({
  where: { isHead: true },
  select: {
    id: true,
    name: true,
    messageHeroImageUrl: true,
    messageHeroImageVerticalPercent: true,
  },
});
if (!head) {
  console.error('No faculty row flagged isHead — aborting.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`Head: ${head.name}`);
console.log(`  hero image : ${head.messageHeroImageUrl ?? '(fallback /assets/mission-vision-hero.webp)'}`);
console.log(`  vertical   : ${head.messageHeroImageVerticalPercent}%  ->  ${NEW_PERCENT}%`);

if (head.messageHeroImageVerticalPercent === NEW_PERCENT) {
  console.log('\nalready set — nothing to do.');
  await prisma.$disconnect();
  process.exit(0);
}

// Other pages fall back to the same file; confirm they are untouched.
const others = await prisma.pageHero.findMany({
  where: { heroImageUrl: { contains: 'mission-vision-hero' } },
  select: { pageKey: true, heroImageVerticalPercent: true },
});
console.log(
  `\n  unchanged elsewhere: ${
    others.length ? others.map((o) => `${o.pageKey}@${o.heroImageVerticalPercent}%`).join(', ') : 'none'
  }`,
);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.faculty.update({
  where: { id: head.id },
  data: { messageHeroImageVerticalPercent: NEW_PERCENT },
});
console.log('\nwritten.');
await prisma.$disconnect();
