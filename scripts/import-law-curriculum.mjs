/**
 * Imports the Law course structure and credit distribution from
 * Programs_and_Course_Curriculum-Law.xlsx.
 *
 * The workbook is parsed at run time — not one course code, title or
 * credit value is transcribed into this file — so the site cannot drift
 * from the source document.
 *
 * Sheets used:
 *   Course_Structure    A=Program  B=Semester  C=Code  D=Title  E=Credits  F=Type
 *   Credit_Distribution A=Program  C=Total  D=Core  G=Project
 *
 * MERGED CELLS: the workbook writes the programme name once per
 * programme and the semester once per semester, leaving the following
 * rows blank. Both are carried forward, which is what those blanks mean.
 *
 * PROGRAMME MATCHING: the workbook names programmes differently from
 * the site ("LLB (Honour's)" vs slug "llb"), so the mapping is declared
 * explicitly below rather than guessed. A programme in the workbook with
 * no mapping is reported and skipped, never silently dropped.
 *
 * The LL.M. (2-Years) programme is DELIBERATELY EXCLUDED at the
 * department's instruction — the 2-year intake is closed (see the
 * "Is the LL.B (2-year) program available?" FAQ), so the site has no
 * page for it. Its rows are read and reported for completeness but
 * never written. Give it a slug below only if that programme reopens.
 *
 * Dry run by default; pass --commit to write.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const SRC = 'C:/Users/Nabid Ahamed Noushad/Downloads/Programs_and_Course_Curriculum-Law-936ab462ff0543e53bb0c49d8f028baf (2).xlsx';
const COMMIT = process.argv.includes('--commit');

// Workbook programme name -> site slug. Null = intentionally not
// published (see the header note on the 2-year LL.M).
const PROGRAM_SLUG = {
  "LLB (Honour's)":  'llb',
  'LL.M. (1-Year)':  'llm',
  'LL.M. (2-Years)': null,   // intake closed — not published
};

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
  .map((m) => dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((t) => t[1].replace(/<[^>]+>/g, '')).join('')));

const sheetNames = [...xml('xl/workbook.xml').matchAll(/<sheet[^>]*name="([^"]*)"/g)]
  .map((m) => dec(m[1]));

/** Rows of a sheet as { A: 'text', B: … } maps, in row order. */
function readSheet(name) {
  const idx = sheetNames.indexOf(name);
  if (idx === -1) throw new Error(`Sheet "${name}" not found`);
  const doc = xml(`xl/worksheets/sheet${idx + 1}.xml`);
  const out = [];
  for (const row of doc.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const [, col, type, val] of
         row[2].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*t="(\w+)")?[^>]*>(?:<v>([\s\S]*?)<\/v>)?/g)) {
      if (val === undefined) continue;
      const text = type === 's' ? shared[Number(val)] : val;
      if (text === undefined) continue;
      cells[col] = String(text);
    }
    if (Object.keys(cells).length) out.push({ r: Number(row[1]), cells });
  }
  return out;
}

// Course titles span several lines in the source ("Law of Media and
// Information &\n Communication Technology"); collapse to one line.
const clean = (v) => (v ?? '').replace(/\s+/g, ' ').trim();

// ── Course_Structure ─────────────────────────────────────────────
const byProgram = new Map();
let program = '';
let semester = '';

for (const { r, cells } of readSheet('Course_Structure')) {
  if (r === 1) continue;                       // header
  if (clean(cells.A)) { program = clean(cells.A); semester = ''; }
  if (clean(cells.B)) semester = clean(cells.B);

  const code = clean(cells.C);
  const title = clean(cells.D);
  if (!code || !title) continue;

  if (!byProgram.has(program)) byProgram.set(program, []);
  byProgram.get(program).push({
    semester,
    code,
    title,
    credits: Number(cells.E),
    type: clean(cells.F) || 'Core',
  });
}

// ── Credit_Distribution ──────────────────────────────────────────
const credits = new Map();
for (const { r, cells } of readSheet('Credit_Distribution')) {
  if (r === 1) continue;
  const name = clean(cells.A);
  if (!name) continue;
  const num = (v) => {
    const n = Number(clean(v));
    return Number.isFinite(n) ? n : null;      // "N/A" -> null
  };
  credits.set(name, {
    totalCredits:   num(cells.C),
    coreCredits:    num(cells.D),
    projectCredits: num(cells.G),
  });
}

// ── report + write ───────────────────────────────────────────────
const p = new PrismaClient();
let failed = false;

for (const [name, rows] of byProgram) {
  const slug = PROGRAM_SLUG[name];
  const cd = credits.get(name) ?? {};
  const semesters = [...new Set(rows.map((c) => c.semester))];
  const sum = rows.reduce((t, c) => t + c.credits, 0);

  console.log('='.repeat(74));
  console.log(`${name}   ->   ${slug ?? '(no page on this site — skipped)'}`);
  console.log('='.repeat(74));
  console.log(`  courses          : ${rows.length}`);
  console.log(`  semesters        : ${semesters.length}`);
  console.log(`  credits (summed) : ${sum}`);
  console.log(`  sheet3 total     : ${cd.totalCredits ?? '—'}   core: ${cd.coreCredits ?? '—'}   project: ${cd.projectCredits ?? '—'}`);
  if (cd.totalCredits != null && Math.abs(sum - cd.totalCredits) > 0.001) {
    console.log(`  NOTE: summed credits (${sum}) differ from the sheet's stated total (${cd.totalCredits}).`);
    console.log('        Both are reported as given; neither is altered.');
  }
  for (const s of semesters) {
    const inSem = rows.filter((c) => c.semester === s);
    const t = inSem.reduce((a, c) => a + c.credits, 0);
    console.log(`    ${s.padEnd(24)} ${String(inSem.length).padStart(2)} courses  ${t} cr`);
  }

  // Every row must have a semester, a code and a finite credit value.
  const bad = rows.filter((c) => !c.semester || !c.code || !Number.isFinite(c.credits));
  if (bad.length) {
    console.error(`  ABORT — ${bad.length} malformed row(s):`, JSON.stringify(bad.slice(0, 3)));
    failed = true;
  }

  if (slug && COMMIT && !failed) {
    const exists = await p.program.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) {
      console.error(`  ABORT — no program row with slug "${slug}".`);
      failed = true;
    } else {
      await p.program.update({
        where: { slug },
        data: {
          courses: rows,
          totalCredits:   cd.totalCredits ?? null,
          coreCredits:    cd.coreCredits ?? null,
          projectCredits: cd.projectCredits ?? null,
        },
      });
      console.log('  written.');
    }
  }
}

const unmapped = [...byProgram.keys()].filter((n) => !(n in PROGRAM_SLUG));
if (unmapped.length) {
  console.error(`\nABORT — workbook programmes with no slug mapping:\n  ${unmapped.join('\n  ')}`);
  failed = true;
}

console.log(failed ? '\nFAILED — nothing further written.'
  : COMMIT ? '\ndone.' : '\ndry run — pass --commit to apply.');
await p.$disconnect();
process.exit(failed ? 1 : 0);
