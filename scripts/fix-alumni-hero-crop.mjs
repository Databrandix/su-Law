/**
 * Moves the Alumni page hero image down so the graduates' faces sit
 * inside the band instead of being cut off above it.
 *
 *   node scripts/fix-alumni-hero-crop.mjs [percent] [--commit]
 *
 * THE PROBLEM: the hero is a fixed-height band with the photo cropped
 * to fill it (object-fit: cover), and objectPosition decides which
 * horizontal slice survives. The source is a 6720x4480 convocation
 * photo in which the row of graduates stands high in the frame — mortar
 * boards at roughly 22% of the image height, chins near 36%. At the
 * seeded "center 50%" the band centred on their gowns, so the rendered
 * hero showed torsos, hands and diplomas with the heads cropped away.
 *
 * DIRECTION: objectPosition's percentage aligns the same point of the
 * IMAGE with that point of the BOX, so a LOWER value pulls the picture
 * DOWN through the frame and reveals more of its top. 50% -> 22% is
 * therefore a move DOWN, bringing the faces into view. (This reads
 * backwards at first glance and has caused wrong guesses before.)
 *
 * ONLY the crop position changes — no layout, height, overlay, image
 * or styling is touched, so the hero keeps the same look as every other
 * page. The value is per-record, so no other hero is affected.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const PAGE_KEY = 'student-society-alumni';

// Overridable so the crop can be re-tuned by eye without editing this
// file: node scripts/fix-alumni-hero-crop.mjs 18 --commit
const arg = process.argv.slice(2).find((a) => /^\d+$/.test(a));
// 6% was verified by reproducing the browser's own object-fit:cover
// maths against the 6720x4480 source for the 1600x500 band: it shows
// the 3.2%–50.1% slice of the photo, which puts every mortar board and
// face well clear of the navbar that overlays the top ~150px.
// 22% was tried first and still cut the heads off — the band is short
// relative to the photo, so it has to sit near the very top.
const NEW_PERCENT = arg ? Number(arg) : 6;

if (NEW_PERCENT < 0 || NEW_PERCENT > 100) {
  console.error(`ABORT — ${NEW_PERCENT} is not a valid percentage.`);
  process.exit(1);
}

const prisma = new PrismaClient();

const hero = await prisma.pageHero.findUnique({
  where: { pageKey: PAGE_KEY },
  select: { pageLabel: true, heroImageUrl: true, heroImageVerticalPercent: true },
});

if (!hero) {
  console.error(`ABORT — no PageHero row with pageKey "${PAGE_KEY}".`);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`hero      : ${hero.pageLabel}`);
console.log(`  image   : ${hero.heroImageUrl}`);
console.log(`  vertical: ${hero.heroImageVerticalPercent}%  ->  ${NEW_PERCENT}%`);

// Other pages may share this same file; confirm they are left alone.
const others = await prisma.pageHero.findMany({
  where: { heroImageUrl: hero.heroImageUrl, NOT: { pageKey: PAGE_KEY } },
  select: { pageKey: true, heroImageVerticalPercent: true },
});
console.log(
  `  sharing this image (unchanged): ${
    others.length ? others.map((o) => `${o.pageKey}@${o.heroImageVerticalPercent}%`).join(', ') : 'none'
  }`,
);

if (hero.heroImageVerticalPercent === NEW_PERCENT) {
  console.log('\nalready set — nothing to do.');
  await prisma.$disconnect();
  process.exit(0);
}

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.pageHero.update({
  where: { pageKey: PAGE_KEY },
  data: { heroImageVerticalPercent: NEW_PERCENT },
});
console.log('\nwritten.');
await prisma.$disconnect();
