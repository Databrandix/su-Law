/**
 * Populates the Department Layout page's office directory from
 * Layout-Plan-…docx, matching the reference department's presentation.
 *
 * The DOCX is parsed at run time — no office name or level is
 * transcribed into this file — so the page cannot drift from the source
 * document.
 *
 * TWO CORRECTIONS, both confirmed by the department:
 *   · The heading row of the source table reads "Department of Bangla",
 *     left over from the template it was copied from. Written as
 *     "Department of Law", which is what every other row describes.
 *   · "Level: 02" in the DOCX renders as "Level 02" to match the
 *     reference page's typography. Digits are untouched.
 *
 * Everything else is verbatim, including "Office of the Law" (row 17),
 * whose wording looks incomplete but which the department asked to keep
 * exactly as written.
 *
 * highlight = the department's own three offices (Dean of the Faculty
 * of Law, Head of Department, and the departmental office). These render
 * in the brand colour, the same treatment the reference page gives its
 * own department rows.
 *
 * Cover image and PDF are deliberately NOT set — they are uploaded later
 * from /admin/about-department-layout, and the page shows a placeholder
 * slot until then.
 *
 * Dry run by default; pass --commit to write.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const SRC = 'C:/Users/Nabid Ahamed Noushad/Downloads/Layout-Plan-83fdaf8ca3eef21a70257d39531cfa3e (1).docx';
const COMMIT = process.argv.includes('--commit');

const DEPT_NAME = 'Department of Law'; // source says "Bangla" — see header
const ADDRESS = '147/I, Panthapath, Greenroad, Dhaka-1215';

// Offices belonging to the Department of Law, matched on the source's
// own wording. Listed here rather than pattern-matched on "Law" so the
// set is explicit and reviewable.
const HIGHLIGHT = new Set([
  'Office of the Dean, Faculty of Law',
  'Office of the Head, Department of Law',
  'Office of the Law',
]);

// ── read the DOCX ────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'docx-'));
const copy = join(dir, 'doc.zip'); // Expand-Archive only accepts .zip
copyFileSync(SRC, copy);
execFileSync('powershell', ['-NoProfile', '-Command',
  `Expand-Archive -LiteralPath '${copy}' -DestinationPath '${dir}\\x' -Force`]);

const xml = readFileSync(join(dir, 'x', 'word', 'document.xml'), 'utf8');
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/**
 * Text of one table cell.
 *
 * Word splits a single word across several <w:r> runs whenever
 * formatting or a spell-check marker changes mid-word, so joining runs
 * with a space corrupts the text ("Level 0 1", "S U Students Affair").
 * Runs are therefore concatenated with NO separator, and only the
 * paragraph boundaries within the cell become spaces — that is where
 * "Office of the Dean" / "Faculty of Law" genuinely splits.
 */
const cellText = (tc) => {
  const paras = [...tc.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) =>
    dec([...p[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((t) => t[1].replace(/<[^>]+>/g, ''))
      .join('')),                    // no separator — see above
  );
  return paras
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
};

const tbl = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)[0];
const rows = [...tbl.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);

// Row 1 = the "Sonargaon University / Department / address" banner,
// row 2 = the column headers. Offices start at row 3.
const offices = [];
for (const r of rows.slice(2)) {
  const cells = [...r.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => cellText(c[0]));
  // "Office of the Dean" and "Faculty of Law" sit in one cell as two
  // paragraphs; the reference page joins that pair with a comma
  // ("Office of the Dean, Faculty of Science and Engineering"), so the
  // same punctuation is applied here. Wording is otherwise untouched.
  const name = cells[0]?.replace(/^Office of the Dean Faculty/, 'Office of the Dean, Faculty');
  if (!name) continue;

  // Right cell reads "Level: 02, Sonargaon University Building: 147/I…".
  // Keep only the level; the university and building line are constant
  // and are rendered by the page itself.
  const levelMatch = cells[1]?.match(/Level:?\s*([^,]+)/i);
  const level = levelMatch ? `Level ${levelMatch[1].trim()}` : (cells[1] ?? '').split(',')[0].trim();

  offices.push({ name, level, highlight: HIGHLIGHT.has(name) });
}

// ── report ───────────────────────────────────────────────────────
console.log(`deptName : ${DEPT_NAME}   (source says "Department of Bangla" — corrected)`);
console.log(`address  : ${ADDRESS}`);
console.log(`offices  : ${offices.length}\n`);
for (const o of offices) {
  console.log(`  ${o.highlight ? '*' : ' '} ${o.name.padEnd(52)} ${o.level}`);
}
console.log('\n  (* = rendered in the brand colour)');

const unmatched = [...HIGHLIGHT].filter((h) => !offices.some((o) => o.name === h));
if (unmatched.length) {
  console.error(`\nABORT — highlight names not found in the DOCX:\n  ${unmatched.join('\n  ')}`);
  process.exit(1);
}

if (COMMIT) {
  const p = new PrismaClient();
  await p.aboutDepartmentLayout.update({
    where: { id: 'singleton' },
    data: {
      deptName: DEPT_NAME,
      address: ADDRESS,
      offices,
      cardTitle: 'Departmental Layout Plan',
      // Clear the inherited BA artwork so the page shows its
      // placeholder slots until the real files are uploaded.
      coverUrl: null,
      coverPublicId: null,
      pdfUrl: null,
      pdfPublicId: null,
      pdfFileName: null,
    },
  });
  console.log('\nwritten.');
  await p.$disconnect();
} else {
  console.log('\ndry run — pass --commit to apply.');
}
