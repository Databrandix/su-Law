/**
 * Adds the Department of Law notices from
 * News-and-Events-Information.xlsx, sheet "Notice Board".
 *
 * ADDITIVE — existing notices are never deleted. The six Registrar
 * notices already on the board are university-wide and stay put; a slug
 * that already exists is updated in place rather than duplicated, so
 * re-running is safe.
 *
 * Column map (sheet 3):
 *   B title · C category · D department · E publishedAt
 *   F displayDate · G description · H attachment file name
 *
 * Everything is read from the file at run time — no copy is transcribed
 * here, so the import cannot drift from the sheet.
 *
 * ONE THING THE SHEET DOES NOT PROVIDE:
 *   · the attachment itself. Column H names "exam-schedule-Spring2026.pdf"
 *     for three rows, but that file is not in this project, so fileUrl
 *     stays null (the schema allows it) and the notice renders without a
 *     download link until one is uploaded from /admin/notices.
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

// "Notice Board" is the third sheet in this workbook.
const rows = new Map();
for (const row of xml('xl/worksheets/sheet3.xml').matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
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

// The six notices already on the board render their displayDate as
// "27 Apr, 2026"; match that so the new rows do not look foreign.
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDisplay = (d) =>
  `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;

function slugify(s) {
  return s.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ── build the rows ───────────────────────────────────────────────
const notices = [];
for (const [n, c] of [...rows.entries()].filter(([n]) => n > 1)) {
  const title = txt(c.B);
  if (!title) continue;
  const publishedAt = excelDate(c.E);
  const displaySerial = excelDate(c.F);
  notices.push({
    rowNumber:   n,
    slug:        slugify(title),
    title,
    category:    txt(c.C) ?? 'Academic',
    department:  txt(c.D) ?? 'Department of Law',
    publishedAt,
    // Column F carries its own serial (one day after E in every row);
    // formatted rather than passed through as a raw number.
    displayDate: displaySerial ? formatDisplay(displaySerial) : null,
    description: txt(c.G) ?? '',
    attachmentFromSheet: txt(c.H), // reported, not stored — see header
  });
}

// ── report ───────────────────────────────────────────────────────
const p = new PrismaClient();
const before = await p.notice.count();
const existingSlugs = new Set(
  (await p.notice.findMany({ select: { slug: true } })).map((r) => r.slug),
);
console.log(`notices already on the board: ${before} (none will be deleted)`);
console.log(`notices read from the sheet : ${notices.length}\n`);

for (const nt of notices) {
  console.log('='.repeat(68));
  console.log(`row ${nt.rowNumber}: ${nt.title}`);
  console.log('='.repeat(68));
  console.log(`  slug        ${nt.slug}${existingSlugs.has(nt.slug) ? '   [EXISTS — will update]' : '   [new]'}`);
  console.log(`  category    ${nt.category}`);
  console.log(`  department  ${nt.department}`);
  console.log(`  publishedAt ${nt.publishedAt ? nt.publishedAt.toISOString().slice(0, 10) : '(none)'}`);
  console.log(`  displayDate ${nt.displayDate ?? '(none)'}`);
  console.log(`  attachment  ${nt.attachmentFromSheet
    ? `none stored (sheet names "${nt.attachmentFromSheet}", not in project)`
    : '(none in sheet)'}`);
}

// publishedAt is required and drives the board's ordering, so refuse
// rather than write a row without one.
const undated = notices.filter((nt) => !nt.publishedAt);
if (undated.length) {
  console.error(`\nABORT — ${undated.length} row(s) have no published date.`);
  await p.$disconnect();
  process.exit(1);
}

if (COMMIT) {
  for (const nt of notices) {
    const data = {
      title:       nt.title,
      category:    nt.category,
      department:  nt.department,
      publishedAt: nt.publishedAt,
      displayDate: nt.displayDate,
      description: nt.description,
    };
    // Upsert, so re-running refreshes rather than duplicates. The file
    // fields are untouched on update — an attachment uploaded through
    // the admin panel must survive a re-import.
    await p.notice.upsert({
      where:  { slug: nt.slug },
      create: { slug: nt.slug, ...data },
      update: data,
    });
  }
  const after = await p.notice.count();
  console.log(`\nwritten — board went from ${before} to ${after} notices.`);
} else {
  console.log('\ndry run — pass --commit to apply.');
}
await p.$disconnect();
