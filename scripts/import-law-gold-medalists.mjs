/**
 * Imports the Law department's gold medalists as alumni.
 *
 * Source: GOLD MEDALIST INFO.xlsx — parsed at run time, so no name,
 * student ID or grade is transcribed into this file.
 *
 * ONLY LAW ROWS. The workbook is a university-wide call-tracking sheet:
 * 64 rows across BBA, EEE, CE, ME, NAME, TE and CSE. Rows are selected
 * by a student ID beginning LLB/LLM, not by the DEPARTMENT column —
 * one Law row has a corrupted date there ("26583") where the department
 * should be, and would be missed by a column match.
 *
 * PERSONAL DATA IS DELIBERATELY NOT IMPORTED. The sheet carries phone
 * numbers, dates of birth, parents' phone numbers, home addresses,
 * email addresses and internal call notes ("Unreachable", "Negative",
 * and free-text remarks about people's employers). The alumni page is
 * public. Only name, student ID, programme and honour are taken —
 * everything else stays in the spreadsheet where it belongs.
 *
 * DESIGNATION IS LEFT EMPTY at the department's instruction; it will be
 * filled in from the CMS. Photos likewise — the page already renders an
 * icon placeholder when photoUrl is null.
 *
 * Mohammad Kamruzzaman appears twice (same phone and email): once for
 * LL.B and once for LL.M. Both are kept — two separate awards.
 *
 * Dry run by default; pass --commit to write.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const XLSX = 'C:/Users/Nabid Ahamed Noushad/Downloads/GOLD MEDALIST INFO.xlsx';

if (!fs.existsSync(XLSX)) {
  console.error(`Workbook not found:\n  ${XLSX}`);
  process.exit(1);
}

// ── unzip + parse (no xlsx dependency) ──────────────────────────────
const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'gold-'));
const zip = path.join(tmp, 'wb.zip');
fs.copyFileSync(XLSX, zip); // Expand-Archive only accepts .zip
execFileSync('powershell', [
  '-NoProfile', '-Command',
  `Expand-Archive -Path '${zip}' -DestinationPath '${path.join(tmp, 'x')}' -Force`,
]);

const read = (p) => fs.readFileSync(path.join(tmp, 'x', p), 'utf8');
const unescape = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// A shared string may be split across several <t> runs; join with no
// separator or words break apart.
const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
);

const sheet = read('xl/worksheets/sheet1.xml');
const rows = [];
for (const m of sheet.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = {};
  for (const c of m[2].matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
    const v = c[3].match(/<v>([\s\S]*?)<\/v>/);
    if (!v) continue;
    cells[c[1]] = c[2].includes('t="s"') ? shared[Number(v[1])] : v[1];
  }
  if (Object.keys(cells).length) rows.push({ n: Number(m[1]), cells });
}
fs.rmSync(tmp, { recursive: true, force: true });

// Columns: A=STUDENT ID  B=NAME  E=HONOR  F=CGPA
const COL = { id: 'A', name: 'B', honour: 'E', cgpa: 'F' };

const tidy = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
// The sheet types honours inconsistently ("summa Cum Laude" /
// "Summa Cum Laude"); title-case them so the cards read evenly.
const titleCase = (s) =>
  tidy(s).toLowerCase().replace(/\b[a-z]/g, (ch) => ch.toUpperCase());

const law = rows
  .filter((r) => /^LL[BM]/i.test(tidy(r.cells[COL.id])))
  .map((r) => {
    const id = tidy(r.cells[COL.id]).toUpperCase();
    return {
      studentId: id,
      name: tidy(r.cells[COL.name]).replace(/\s{2,}/g, ' '),
      // Programme comes from the student ID prefix, which is reliable;
      // the DEPARTMENT column is corrupted on one row.
      department: id.startsWith('LLM') ? 'LL.M' : 'LL.B',
      honour: titleCase(r.cells[COL.honour]),
      cgpa: tidy(r.cells[COL.cgpa]),
      row: r.n,
    };
  })
  .sort((a, b) => Number(b.cgpa) - Number(a.cgpa));

if (law.length === 0) {
  console.error('No LLB/LLM rows found — aborting rather than writing nothing.');
  process.exit(1);
}

// Guard: every row must have the fields the card needs.
const bad = law.filter((r) => !r.name || !r.studentId || !r.honour);
if (bad.length) {
  console.error('Rows missing name/id/honour — aborting:');
  bad.forEach((r) => console.error('   row', r.row, JSON.stringify(r)));
  process.exit(1);
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const prisma = new PrismaClient();
const existing = await prisma.alumni.findMany({ select: { slug: true } });

console.log(`Workbook rows: ${rows.length - 1} · Law rows: ${law.length}\n`);
console.log(`Existing alumni: ${existing.length}\n`);
console.log('To create:');
for (const r of law) {
  console.log(`  ${r.department.padEnd(6)} ${r.studentId.padEnd(15)} ${r.name.padEnd(24)} ${r.honour} · CGPA ${r.cgpa}`);
}
console.log('\nLeft empty for the CMS: designation, company, photo.');
console.log('Not imported (personal data): phone, DOB, parents\' numbers, address, email, call notes.');

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

let created = 0;
let skipped = 0;
for (let i = 0; i < law.length; i++) {
  const r = law[i];
  // Slug includes the student ID: the same person holds both an LL.B
  // and an LL.M medal, so name alone would collide.
  const slug = slugify(`${r.name}-${r.studentId}`);
  if (existing.some((e) => e.slug === slug)) {
    console.log(`  = ${slug} — already present, skipping`);
    skipped++;
    continue;
  }
  await prisma.alumni.create({
    data: {
      slug,
      studentId: r.studentId,
      name: r.name,
      department: r.department,
      // The department will supply these; the card handles blanks.
      designation: '',
      company: '',
      photoUrl: null,
      photoPublicId: null,
      displayOrder: i,
    },
  });
  created++;
}

console.log(`\ncreated ${created}, skipped ${skipped}.`);
await prisma.$disconnect();
