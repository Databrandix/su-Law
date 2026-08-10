/**
 * Replaces the inherited BA events with the Department of Law events
 * from News-and-Events-Information.xlsx, sheet "Events".
 *
 * Column map (sheet 2):
 *   B title · C shortTitle · D category · E status · F eventDate
 *   H time · I venue · J summary · K description · L focus · N image
 *
 * Everything below is read from the file at run time — no copy is
 * transcribed here, so the import cannot drift from the sheet.
 *
 * TWO THINGS THE SHEET DOES NOT PROVIDE:
 *   · imageUrl — required by the schema, and the real photos are not
 *     uploaded yet. Column N names files ("Career Program.jpg") that
 *     do not exist in this project, so each event gets a neutral
 *     placeholder to be replaced from /admin/events.
 *   · displayDate, details, CTA — absent for all three rows, left null
 *     or empty rather than invented.
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

// "Events" is the second sheet in this workbook.
const rows = new Map();
for (const row of xml('xl/worksheets/sheet2.xml').matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = {};
  for (const [, col, type, val] of row[2].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*t="(\w+)")?[^>]*>(?:<v>([\s\S]*?)<\/v>)?/g)) {
    if (val === undefined) continue;
    cells[col] = type === 's' ? shared[Number(val)] : val;
  }
  if (Object.keys(cells).length) rows.set(Number(row[1]), cells);
}

// ── helpers ──────────────────────────────────────────────────────
const txt = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Source typos corrected on the department's instruction. shortTitle is
// the visible page heading and drives the URL, so a misspelling here is
// public. Listed explicitly rather than auto-corrected, so every change
// to the sheet's wording is visible in this file.
const SPELLING_FIXES = {
  'Career Gidelines': 'Career Guidelines',
};
const fixSpelling = (s) => (s === null ? null : SPELLING_FIXES[s] ?? s);

// Excel serial -> Date. 25569 = days between 1900 and 1970 epochs,
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

// The detail page renders `description` as separate paragraphs. The
// sheet stores one block of prose, so split on sentence boundaries
// into readable chunks rather than emitting a single wall of text.
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
const events = [];
for (const [n, c] of [...rows.entries()].filter(([n]) => n > 1)) {
  const title = txt(c.B);
  if (!title) continue;
  const shortTitle = fixSpelling(txt(c.C)) ?? title;
  events.push({
    rowNumber:   n,
    slug:        slugify(shortTitle),
    title,
    shortTitle,
    category:    txt(c.D) ?? 'Seminar',
    status:      txt(c.E) ?? 'Past',
    eventDate:   excelDate(c.F),
    displayDate: txt(c.G),          // absent in this sheet
    time:        txt(c.H),
    venue:       txt(c.I),
    summary:     txt(c.J) ?? '',
    description: paragraphs(txt(c.K) ?? ''),
    focus:       txt(c.L) ?? '',
    details:     [],                // sheet column M is empty
    ctaLabel:    txt(c.O),
    ctaHref:     txt(c.P),
    imageFromSheet: txt(c.N),       // reported, not stored — see header
  });
}

// ── report ───────────────────────────────────────────────────────
const p = new PrismaClient();
const existing = await p.event.count();
console.log(`existing events to delete: ${existing}`);
console.log(`events read from the sheet: ${events.length}\n`);

for (const e of events) {
  console.log('='.repeat(68));
  console.log(`row ${e.rowNumber}: ${e.title}`);
  console.log('='.repeat(68));
  console.log(`  slug        ${e.slug}`);
  const sheetShort = txt(rows.get(e.rowNumber).C);
  console.log(`  shortTitle  ${e.shortTitle}${sheetShort !== e.shortTitle ? `   [sheet: "${sheetShort}" — spelling corrected]` : ''}`);
  console.log(`  category    ${e.category}`);
  console.log(`  status      ${e.status}`);
  console.log(`  eventDate   ${e.eventDate ? e.eventDate.toISOString().slice(0, 10) : '(none)'}`);
  console.log(`  time        ${e.time ?? '(none)'}`);
  console.log(`  venue       ${e.venue ?? '(none)'}`);
  console.log(`  focus       ${e.focus}`);
  console.log(`  paragraphs  ${e.description.length}`);
  console.log(`  image       PLACEHOLDER (sheet names "${e.imageFromSheet}", not in project)`);
}

if (COMMIT) {
  await p.$transaction([
    p.event.deleteMany({}),
    ...events.map((e, i) =>
      p.event.create({
        data: {
          slug: e.slug,
          title: e.title,
          shortTitle: e.shortTitle,
          category: e.category,
          status: e.status,
          eventDate: e.eventDate,
          displayDate: e.displayDate,
          time: e.time,
          venue: e.venue,
          imageUrl: PLACEHOLDER,
          imagePublicId: null,
          summary: e.summary,
          description: e.description,
          focus: e.focus,
          details: e.details,
          ctaLabel: e.ctaLabel,
          ctaHref: e.ctaHref,
          ctaExternal: false,
          displayOrder: i,
        },
      }),
    ),
  ]);
  console.log(`\nwritten — ${existing} deleted, ${events.length} created.`);
} else {
  console.log('\ndry run — pass --commit to apply.');
}
await p.$disconnect();
