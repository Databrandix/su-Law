#!/usr/bin/env node
/**
 * Convert all PNG/JPG/JPEG assets in public/assets to WebP at quality 82.
 * Preserves resolution. Deletes originals. Skips files <50KB and already-WebP.
 *
 * Usage: node scripts/optimize-images.mjs
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = 'public/assets';
const MIN_SIZE_BYTES = 50 * 1024; // 50 KB
const QUALITY = 82;
const EFFORT = 6;
const TARGET_EXT = new Set(['.png', '.jpg', '.jpeg']);

let totalBefore = 0;
let totalAfter = 0;
let converted = 0;
let skipped = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    const ext = extname(entry.name).toLowerCase();
    if (!TARGET_EXT.has(ext)) {
      continue;
    }
    const info = await stat(path);
    if (info.size < MIN_SIZE_BYTES) {
      console.log(`skip (small): ${path} (${(info.size / 1024).toFixed(1)} KB)`);
      skipped++;
      continue;
    }
    const outPath = path.replace(/\.(png|jpe?g)$/i, '.webp');
    try {
      await sharp(path, { failOn: 'none' })
        .webp({ quality: QUALITY, effort: EFFORT, alphaQuality: 90 })
        .toFile(outPath);
      const outInfo = await stat(outPath);
      totalBefore += info.size;
      totalAfter += outInfo.size;
      converted++;
      console.log(
        `${path} -> ${outPath}  ${(info.size / 1024).toFixed(0)}KB -> ${(outInfo.size / 1024).toFixed(0)}KB`
      );
      await unlink(path);
    } catch (err) {
      console.error(`FAILED: ${path}`, err.message);
    }
  }
}

await walk(ROOT);

console.log('\n--- Summary ---');
console.log(`Converted: ${converted}`);
console.log(`Skipped (small): ${skipped}`);
console.log(`Total before: ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
console.log(`Total after:  ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
console.log(`Saved:        ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)} MB`);
