/**
 * Replaces the inherited BA news with the Department of Law news from
 * News-and-Events-Information.xlsx, sheet "News".
 *
 * Column map (sheet 1):
 *   B title · C shortTitle · D category · E publishedAt
 *   F displayDate · G summary · H body · I cover image · J extra info
 *
 * Everything is read from the file at run time — no copy is transcribed
 * here, so the import cannot drift from the sheet.
 *
 * TWO THINGS THE SHEET DOES NOT PROVIDE:
 *   · coverUrl — required by the schema, and the real photos are not
 *     uploaded yet. Column I names files ("Court Visit.jpg") that do
 *     not exist in this project, so each row gets a neutral placeholder
 *     to be replaced from /admin/news.
 *   · displayDate / meta — columns F and J are empty for all three
 *     rows, so they stay null and [] rather than being invented.
 *
 * The sheet's three categories (Industrial Visit, Seminar, Event) are
 * all already in newsCategoryEnum, so none needed remapping.
 *
 * Dry run by default; pass --commit to write.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const SRC = 'C:/Users/Nabid Ahamed Noushad/Downloads/News-and-Events-Information.xlsx';
const COMMIT = process.argv.includes('--commit');
const PLACEHOLDER = '/assets/events-hero.webp';

// ── read the workbook ────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'xlsx-'));
const copy = join(dir, 'book.zip'); // Expand-Archive only accepts .zip
copyFileSync(SRC, copy);
execFileSync('powershell', ['-NoProfile', '-Command',
  `Expand-Archive -LiteralPath '${copy}' -DestinationPath '${dir}\\x' -Force`]);

const xml = (p) => readFileSync(join(dir, 'x', p), 'utf8');
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#10;/g, '\n').replace(/&amp;/g, '&');

const shared = [...xml('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
  .map((m) => dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));

// "News" is the first sheet in this workbook.
const rows = new Map();
for (const row of xml('xl/worksheets/sheet1.xml').matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = {};
  for (const [, col, type, val] of row[2].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*t="(\w+)")?[^>]*>(?:<v>([\s\S]*?)<\/v>)?/g)) {
    if (val === undefined) continue;
    cells[col] = type === 's' ? shared[Number(val)] : val;
  }
  if (Object.keys(cells).length) rows.set(Number(row[1]), cells);
}

// ── helpers ──────────────────────────────────────────────────────
const txt = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Excel serial -> Date. 25569 = days between the 1900 and 1970 epochs,
// including Excel's phantom 1900-02-29.
const excelDate = (v) =>
  v === undefined || v === null || v === '' ? null
    : new Date(Math.round((Number(v) - 25569) * 86400 * 1000));

function slugify(s) {
  return s.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// The detail page renders `body` as separate paragraphs. The sheet
// stores one block of prose, so split on sentence boundaries into
// readable chunks rather than emitting a single wall of text.
function paragraphs(body) {
  const sentences = body.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!sentences) return [body];
  const out = [];
  for (let i = 0; i < sentences.length; i += 3) {
    out.push(sentences.slice(i, i + 3).join('').trim());
  }
  return out.filter(Boolean);
}

// ── build the rows ───────────────────────────────────────────────
const items = [];
for (const [n, c] of [...rows.entries()].filter(([n]) => n > 1)) {
  const title = txt(c.B);
  if (!title) continue;
  const shortTitle = txt(c.C) ?? title;
  const publishedAt = excelDate(c.E);
  items.push({
    rowNumber:   n,
    slug:        slugify(shortTitle),
    title,
    shortTitle,
    category:    txt(c.D) ?? 'Event',
    publishedAt,
    displayDate: txt(c.F),           // absent in this sheet
    summary:     txt(c.G) ?? '',
    body:        paragraphs(txt(c.H) ?? ''),
    meta:        [],                 // column J empty for all rows
    imageFromSheet: txt(c.I),        // reported, not stored — see header
  });
}

// ── report ───────────────────────────────────────────────────────
const p = new PrismaClient();
const existing = await p.news.count();
console.log(`existing news to delete: ${existing}`);
console.log(`news read from the sheet: ${items.length}\n`);

for (const it of items) {
  console.log('='.repeat(68));
  console.log(`row ${it.rowNumber}: ${it.title}`);
  console.log('='.repeat(68));
  console.log(`  slug        ${it.slug}`);
  console.log(`  shortTitle  ${it.shortTitle}`);
  console.log(`  category    ${it.category}`);
  console.log(`  publishedAt ${it.publishedAt ? it.publishedAt.toISOString().slice(0, 10) : '(none)'}`);
  console.log(`  paragraphs  ${it.body.length}`);
  console.log(`  image       PLACEHOLDER (sheet names "${it.imageFromSheet}", not in project)`);
}

// Guard: a null publishedAt would break the required column and the
// list's sort order, so refuse rather than write a bad row.
const undated = items.filter((it) => !it.publishedAt);
if (undated.length) {
  console.error(`\nABORT — ${undated.length} row(s) have no published date.`);
  await p.$disconnect();
  process.exit(1);
}

if (COMMIT) {
  await p.$transaction([
    p.news.deleteMany({}),
    ...items.map((it) =>
      p.news.create({
        data: {
          slug: it.slug,
          title: it.title,
          shortTitle: it.shortTitle,
          category: it.category,
          publishedAt: it.publishedAt,
          displayDate: it.displayDate,
          summary: it.summary,
          coverUrl: PLACEHOLDER,
          coverPublicId: null,
          body: it.body,
          meta: it.meta,
        },
      }),
    ),
  ]);
  console.log(`\nwritten — ${existing} deleted, ${items.length} created.`);
} else {
  console.log('\ndry run — pass --commit to apply.');
}
await p.$disconnect();
