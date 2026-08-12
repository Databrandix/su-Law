/**
 * Replaces the gallery with the Law department's own photographs.
 *
 * The 20 existing rows came with the Business-Administration template
 * and 19 of them still live on that department's Cloudinary account
 * (n3n2tgqk/bba-dept/…) — an account this project has no credentials
 * for and cannot keep working. They are deleted.
 *
 * In their place go the photos already published elsewhere on this
 * site: the event photographs and the two Law societies' pictures, all
 * on the Law account. Nothing is uploaded and no new asset is created —
 * the gallery points at the same files those pages use, so a photo can
 * never appear here that does not appear on the site.
 *
 * DIMENSIONS are read from Cloudinary's Admin API rather than assumed:
 * the masonry grid lays out from width/height, and wrong numbers would
 * distort every tile.
 *
 * ALT TEXT comes from the source record's own title, so each image is
 * described by the event or club it depicts.
 *
 * Dry run by default; pass --commit to write.
 */
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

function readEnv() {
  const raw = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = readEnv();
const AUTH = 'Basic ' +
  Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString('base64');

const prisma = new PrismaClient();
const isLaw = (u) => !!u && u.includes(`/${env.CLOUDINARY_CLOUD_NAME}/`);

// ── collect the department's photos from what is already published ──
const [events, clubs] = await Promise.all([
  prisma.event.findMany({ orderBy: { displayOrder: 'asc' } }),
  prisma.club.findMany({ orderBy: { displayOrder: 'asc' } }),
]);

const pool = [];
for (const e of events) {
  if (isLaw(e.imageUrl)) pool.push({ url: e.imageUrl, alt: e.title, from: 'event' });
}
for (const c of clubs) {
  // Card and hero are usually two different photographs of the same
  // club; both are worth showing, and the de-dupe below drops them if
  // they turn out to be the same file.
  for (const key of ['imageUrl', 'heroImageUrl', 'introImageUrl']) {
    if (isLaw(c[key])) pool.push({ url: c[key], alt: c.name, from: `club.${key}` });
  }
}

// De-dupe on the Cloudinary public id, not the URL: the same asset is
// delivered with different transformation prefixes in different places.
const publicIdOf = (url) => {
  const m = url.match(/\/upload\/(?:[^/]+\/)*?(v\d+\/.+?)\.[a-z0-9]+$/i);
  return m ? m[1].replace(/^v\d+\//, '') : url;
};
const seen = new Set();
const picked = [];
for (const item of pool) {
  const id = publicIdOf(item.url);
  if (seen.has(id)) continue;
  seen.add(id);
  picked.push({ ...item, publicId: id });
}

if (picked.length === 0) {
  console.error('No Law-account photos found — refusing to empty the gallery. Aborting.');
  await prisma.$disconnect();
  process.exit(1);
}

// ── real dimensions from Cloudinary ─────────────────────────────────
console.log(`Reading dimensions for ${picked.length} images…`);
for (const item of picked) {
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/image/upload/${encodeURIComponent(item.publicId)}`,
    { headers: { Authorization: AUTH } },
  );
  if (!res.ok) {
    console.error(`  FAILED ${item.publicId} (HTTP ${res.status}) — aborting rather than guessing.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const meta = await res.json();
  item.width = meta.width;
  item.height = meta.height;
}

const existing = await prisma.galleryImage.findMany({ orderBy: { displayOrder: 'asc' } });
const onOldAccount = existing.filter((g) => /n3n2tgqk|bba-dept/.test(g.imageUrl)).length;

console.log(`\nDELETE ${existing.length} existing row(s) — ${onOldAccount} on the old BA account\n`);
console.log(`CREATE ${picked.length}:`);
picked.forEach((p, i) =>
  console.log(`  ${String(i + 1).padStart(2)} ${String(p.width).padStart(5)}x${String(p.height).padEnd(5)} ${p.from.padEnd(20)} ${p.alt.slice(0, 44)}`),
);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

// One transaction: the gallery is never left empty if the insert fails.
await prisma.$transaction(async (tx) => {
  await tx.galleryImage.deleteMany({});
  for (let i = 0; i < picked.length; i++) {
    const p = picked[i];
    await tx.galleryImage.create({
      data: {
        imageUrl: p.url,
        imagePublicId: p.publicId,
        alt: p.alt,
        width: p.width,
        height: p.height,
        displayOrder: i,
      },
    });
  }
});

console.log(`\ndeleted ${existing.length}, created ${picked.length}.`);
await prisma.$disconnect();
