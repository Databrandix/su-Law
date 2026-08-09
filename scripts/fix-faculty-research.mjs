/**
 * Rebuild every faculty member's `research` section from the source
 * spreadsheet so each entry is a clickable { text, link } pair.
 *
 * Why this exists: the rows currently in the DB hold only the label
 * strings ("DOI", "Scholink", …) with the urls dropped, so the Research
 * panel renders unclickable text. The template's Research section is
 * meant to look like:
 *
 *     • Google Scholar
 *       https://scholar.google.com/citations?user=…
 *     • Research Gate
 *       https://www.researchgate.net/profile/…
 *
 * A scholar profile (Google Scholar / ResearchGate / ORCID / …) is the
 * ideal entry. Nobody in this source has one, so per the department's
 * instruction each remaining link keeps a title relevant to what it
 * actually points at — the publisher or repository hosting it — and the
 * url renders below it as the anchor.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/fix-faculty-research.mjs
 *   node --env-file=.env scripts/fix-faculty-research.mjs --commit
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const SRC = String.raw`C:\Users\Nabid Ahamed Noushad\Downloads\Facultys-Informations-for-website-1-e61cceede69d964b655b7ef8753aff39 (2).xlsx`;
const COMMIT = process.argv.includes('--commit');

// ── xlsx reading (dependency-free: unzip + parse the XML parts) ──────

const WORK = path.join(process.env.TEMP ?? '.', 'law-research-fix');
if (existsSync(WORK)) rmSync(WORK, { recursive: true, force: true });
execSync(
  `powershell -NoProfile -Command "Add-Type -A System.IO.Compression.FileSystem; ` +
    `[System.IO.Compression.ZipFile]::ExtractToDirectory('${SRC}','${WORK}')"`,
);

const dec = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const ssXml = readFileSync(path.join(WORK, 'xl', 'sharedStrings.xml'), 'utf8');
const shared = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => dec(t[1])).join(''),
);

function readSheet(n) {
  const xml = readFileSync(path.join(WORK, 'xl', 'worksheets', `sheet${n}.xml`), 'utf8');
  const rows = [];
  for (const rm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cm of rm[2].matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const body = cm[3] ?? '';
      const inline = body.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/);
      const v = body.match(/<v>([\s\S]*?)<\/v>/);
      const val = inline ? dec(inline[1]) : v ? (/t="s"/.test(cm[2]) ? shared[+v[1]] : v[1]) : '';
      if (val !== '') cells[cm[1]] = val;
    }
    if (Object.keys(cells).length) rows.push({ r: +rm[1], cells });
  }
  return rows;
}

// One sheet per faculty member; sheet 1 is row-2-only, the rest stack
// their list values down column P.
const SHEETS = [1, 2, 3, 4, 5, 6, 7];

// ── labelling ───────────────────────────────────────────────────────

// A genuine scholar profile — the entry the template is designed for.
const PROFILES = [
  { rx: /scholar\.google\./i, text: 'Google Scholar' },
  { rx: /researchgate\.net/i, text: 'Research Gate' },
  { rx: /orcid\.org/i, text: 'ORCID' },
  { rx: /academia\.edu/i, text: 'Academia.edu' },
  { rx: /ssrn\.com/i, text: 'SSRN' },
];

// No profile → title the link by what it actually points at. Every
// label below names the publisher/repository hosting the url, so the
// heading stays truthful without inventing an article title.
const HOSTS = [
  { rx: /bildbd\.com/i, text: 'BiLD Law Journal' },
  { rx: /su\.edu\.bd/i, text: 'Sonargaon University Journal' },
  { rx: /saudijournals\.com/i, text: 'Scholars Middle East Publishers' },
  { rx: /scholink\.org/i, text: 'Scholink — Applied Psychology & Education' },
  { rx: /rsisinternational\.org/i, text: 'IJRISS — RSIS International' },
  { rx: /legalresearchanalysis\.com/i, text: 'Legal Research & Analysis' },
  { rx: /iprtrends\.com/i, text: 'Trends in Intellectual Property Research' },
  { rx: /ijaresm\.com/i, text: 'IJARESM' },
  { rx: /doi\.org/i, text: 'DOI' },
];

function label(url) {
  const p = PROFILES.find((x) => x.rx.test(url));
  if (p) return { text: p.text, isProfile: true };
  const h = HOSTS.find((x) => x.rx.test(url));
  return { text: h ? h.text : 'Publication Link', isProfile: false };
}

/**
 * Build the research list for one sheet.
 *
 * Every url in the source is kept, including the DOI alongside the
 * publisher's own link for the same article. A DOI is a permanent
 * identifier — the journal's url can move, the DOI resolves forever —
 * so both are worth surfacing on an academic profile.
 *
 * The only entry dropped is an exact duplicate url; the source repeats
 * a few across rows.
 */
function buildResearch(rows) {
  const cells = rows.filter((r) => r.r > 1 && r.cells['P']).map((r) => r.cells['P']);

  const out = [];
  const seen = new Set();

  for (const cell of cells) {
    // One cell can hold "URL: … DOI: …" — take the urls in order.
    const urls = (cell.match(/https?:\/\/\S+/g) ?? []).map((u) => u.replace(/[.,;]+$/, ''));

    for (const url of urls) {
      if (seen.has(url)) continue;
      seen.add(url);
      const { text, isProfile } = label(url);
      out.push({ text, link: url, isProfile });
    }
  }

  // Scholar profiles first — they describe the person, not one paper.
  out.sort((a, b) => Number(b.isProfile) - Number(a.isProfile));

  return out.map(({ text, link }) => ({ text, link }));
}

// ── apply ───────────────────────────────────────────────────────────

const prisma = new PrismaClient();
try {
  const dbRows = await prisma.faculty.findMany({
    orderBy: { displayOrder: 'asc' },
    select: { id: true, name: true, slug: true, research: true },
  });

  const plan = [];

  for (const n of SHEETS) {
    const rows = readSheet(n);
    const rawName = (rows.find((r) => r.r === 2)?.cells['B'] ?? '').trim();
    if (!rawName) continue;

    // Match on a normalized name — the source has trailing \r\n and
    // inconsistent casing ("MD. ANAMUL HAQUE").
    const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
    const match = dbRows.find((d) => norm(d.name) === norm(rawName));
    if (!match) {
      console.log(`!! sheet${n} "${rawName}" — no matching faculty row, skipped`);
      continue;
    }

    const research = buildResearch(rows);
    plan.push({ id: match.id, name: match.name, before: match.research, after: research });
  }

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  for (const p of plan) {
    console.log(`--- ${p.name}`);
    const beforeList = Array.isArray(p.before) ? p.before : p.before ? [p.before] : [];
    console.log(`    before (${beforeList.length}, no links):`);
    for (const b of beforeList) console.log(`      · ${typeof b === 'string' ? b : b.text}`);
    console.log(`    after  (${p.after.length}, clickable):`);
    for (const a of p.after) console.log(`      · ${a.text}\n        ${a.link}`);
    console.log();
  }

  if (COMMIT) {
    for (const p of plan) {
      await prisma.faculty.update({
        where: { id: p.id },
        // Empty stays null so the panel shows its placeholder rather
        // than an empty bullet list.
        data: { research: p.after.length ? p.after : null },
      });
    }
    console.log(`Updated ${plan.length} faculty rows.`);
  }
} finally {
  await prisma.$disconnect();
}
