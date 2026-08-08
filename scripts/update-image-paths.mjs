#!/usr/bin/env node
/**
 * Replace /assets/...png|.jpg|.jpeg references with .webp across src/.
 * Only matches paths inside string literals (after a quote char).
 * Leaves external URLs (unsplash, picsum) untouched.
 *
 * Usage: node scripts/update-image-paths.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = 'src';
const TARGET_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Match: ('|"|`)/assets/...something.(png|jpg|jpeg)(same quote)
const RE = /(['"`])(\/assets\/[^'"`]+?)\.(png|jpe?g)(\1)/gi;

let filesChanged = 0;
let replacements = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!TARGET_EXT.has(extname(entry.name).toLowerCase())) {
      continue;
    }
    const content = await readFile(path, 'utf8');
    let localCount = 0;
    const updated = content.replace(RE, (_match, openQ, pathPart, _ext, closeQ) => {
      localCount++;
      return `${openQ}${pathPart}.webp${closeQ}`;
    });
    if (localCount > 0) {
      await writeFile(path, updated, 'utf8');
      filesChanged++;
      replacements += localCount;
      console.log(`${path}: ${localCount} replacement(s)`);
    }
  }
}

await walk(ROOT);

console.log('\n--- Summary ---');
console.log(`Files changed: ${filesChanged}`);
console.log(`Total replacements: ${replacements}`);
