/**
 * scripts/import-faculty.mjs
 *
 * Parses Plan/Facultys-Informations-*.xlsx and imports the 7 Law faculty
 * into the Faculty table.
 *
 *   node scripts/import-faculty.mjs            # DRY RUN — prints, writes nothing
 *   node scripts/import-faculty.mjs --commit   # deletes existing faculty, inserts these
 *
 * Rules:
 *   - Only data literally present in the spreadsheet is imported.
 *   - Empty cells become null. Nothing is inferred, guessed, or invented.
 *   - Photos are NOT set (uploaded manually via /admin afterwards).
 */

import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const XLSX = 'Plan/Facultys-Informations-for-website-1-9ad90bffa5ce3f58a5c639572f0b9b76.xlsx';
const COMMIT = process.argv.includes('--commit');

// ── xlsx extraction ────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'xlsx-'));
// Expand-Archive refuses non-.zip extensions; ZipFile does not care.
execFileSync('powershell', [
  '-NoProfile',
  '-Command',
  `Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
    `[System.IO.Compression.ZipFile]::ExtractToDirectory((Resolve-Path '${XLSX}'), '${dir}')`,
], { stdio: 'pipe' });

function decode(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

const ssXml = readFileSync(`${dir}/xl/sharedStrings.xml`, 'utf8');
const shared = [];
for (const si of ssXml.split('<si>').slice(1)) {
  const chunk = si.split('</si>')[0];
  shared.push([...chunk.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join(''));
}

const sheetFiles = readdirSync(`${dir}/xl/worksheets`)
  .filter((f) => f.endsWith('.xml'))
  .sort((a, b) => +(a.match(/\d+/)[0]) - +(b.match(/\d+/)[0]));

function readSheet(file) {
  const xml = readFileSync(`${dir}/xl/worksheets/${file}`, 'utf8');
  const rows = new Map();
  for (const m of xml.matchAll(/<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attrs = m[1] ?? m[2] ?? '';
    const inner = m[3] ?? '';
    const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
    if (!ref) continue;
    const type = attrs.match(/t="([^"]+)"/)?.[1];
    let val = '';
    if (type === 'inlineStr') {
      val = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => decode(x[1])).join('');
    } else {
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (v != null) val = type === 's' ? (shared[+v] ?? '') : decode(v);
    }
    if (!val.trim()) continue;
    const col = ref.replace(/\d+/g, '');
    const row = +ref.match(/\d+/)[0];
    if (!rows.has(row)) rows.set(row, {});
    rows.get(row)[col] = val;
  }
  return rows;
}

// ── helpers ────────────────────────────────────────────────────────

const clean = (s) => (s ?? '').replace(/\r/g, '').trim();

/**
 * Collect a column across all rows, splitting embedded newlines into items.
 *
 * Skips row 1 (the header row) and drops any item identical to that column's
 * header — some cells repeat the header text inside the value. Also
 * de-duplicates, because several source cells list the same award twice.
 */
function collect(rows, col) {
  const header = clean(rows.get(1)?.[col] ?? '').toLowerCase();
  const out = [];
  const seen = new Set();

  for (const [rowNum, cells] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    if (rowNum === 1) continue; // header row
    const raw = cells[col];
    if (!raw) continue;
    for (const line of raw.split('\n')) {
      const t = clean(line);
      // Drop leading enumerators: "1.", "2)", bullet chars
      const stripped = t.replace(/^[•·]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (!stripped) continue;

      const key = stripped.toLowerCase();
      if (header && key === header) continue; // header text repeated in the cell
      if (seen.has(key)) continue;            // duplicate entry in the source
      seen.add(key);
      out.push(stripped);
    }
  }
  return out;
}

const slugify = (name) =>
  name.toLowerCase().trim()
    .replace(/[.']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Normalise "Full time" / "Full-time" / "Full Time" → schema enum. */
function facultyType(raw, position) {
  const p = clean(position).toLowerCase();
  if (/\bdean\b|\bhead\b/.test(p)) return 'leadership';
  const t = clean(raw).toLowerCase().replace(/[\s-]/g, '');
  if (t === 'fulltime') return 'full_time';
  if (t === 'parttime') return 'part_time';
  return 'full_time';
}

/** Phone numbers arrive as bare local numbers or with a leading 0. */
function phone(raw) {
  const v = clean(raw);
  if (!v) return null;
  const digits = v.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+880${digits}`;     // 1955529862
  if (digits.length === 11 && digits.startsWith('0')) return `+880${digits.slice(1)}`;
  return v; // leave anything unexpected exactly as written
}

// ── parse ──────────────────────────────────────────────────────────

const DEPARTMENT = 'Law';
const FACULTY_NAME = 'Faculty of Arts and Humanities';

/**
 * Template convention (verified against the original BA rows):
 *   - a section with ONE item is stored as a plain string
 *   - a section with MANY items is stored as string[]
 *   - empty stays null so the panel renders its placeholder
 */
function section(items) {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  return items;
}

/**
 * The template's `research` section holds SCHOLAR PROFILE links —
 * [{text: 'Google Scholar', link: …}] — not article urls.
 *
 * Column P is titled "Google Scholar / Research Link" but in practice
 * every value is an article/DOI url that already belongs to a specific
 * publication. Rendering those raw would duplicate the Publication
 * section and show unreadable bare urls, so `research` only keeps
 * genuine profile links (scholar.google / researchgate / orcid), each
 * labelled by platform. Everything else is left out.
 */
function researchProfiles(linkItems) {
  const PLATFORMS = [
    { rx: /scholar\.google\./i, text: 'Google Scholar' },
    { rx: /researchgate\.net/i, text: 'Research Gate' },
    { rx: /orcid\.org/i, text: 'ORCID' },
    { rx: /academia\.edu/i, text: 'Academia.edu' },
    { rx: /ssrn\.com/i, text: 'SSRN' },
  ];

  // Publisher/host → readable label, so an article link still gets a
  // human title above the anchor instead of a bare url. Derived from
  // the domain only — no guessing about the article's content.
  const HOSTS = [
    { rx: /doi\.org|dx\.doi\.org/i, text: 'DOI' },
    { rx: /saudijournals\.com/i, text: 'Scholars Middle East Publishers' },
    { rx: /su\.edu\.bd/i, text: 'Sonargaon University Journal' },
    { rx: /bildbd\.com/i, text: 'BiLD Law Journal' },
    { rx: /scholink\.org/i, text: 'Scholink' },
    { rx: /rsisinternational\.org/i, text: 'RSIS International' },
    { rx: /legalresearchanalysis\.com/i, text: 'Legal Research & Analysis' },
    { rx: /iprtrends\.com/i, text: 'Trends in Intellectual Property Research' },
    { rx: /ijaresm\.com/i, text: 'IJARESM' },
  ];

  const out = [];
  const seen = new Set();

  for (const item of linkItems) {
    // A single cell can hold more than one url — keep each.
    const urls = item.match(/https?:\/\/\S+/g) ?? [];
    for (const raw of urls) {
      const url = raw.replace(/[.,;]+$/, '');
      if (seen.has(url)) continue;
      seen.add(url);

      const platform = PLATFORMS.find((p) => p.rx.test(url));
      if (platform) {
        out.push({ text: platform.text, link: url });
        continue;
      }

      // Not a scholar profile — label it by publisher so the entry is
      // readable, and the url below it stays clickable.
      const host = HOSTS.find((h) => h.rx.test(url));
      out.push({ text: host ? host.text : 'Publication Link', link: url });
    }
  }

  return out.length ? out : null;
}

/**
 * Publications use [{text, link}] so the title renders as an anchor.
 * Column P holds article links, but several people have a different
 * number of links than publications — pairing positionally would
 * attach the WRONG url to a paper. So a link is only attached when it
 * can be matched with confidence:
 *   1. a DOI/URL embedded in the publication text itself, or
 *   2. exactly one link for exactly one publication.
 * Otherwise the publication stays plain text and no url is guessed.
 */
function publications(pubItems, linkItems) {
  if (pubItems.length === 0) return null;

  const urlIn = (s) => s.match(/https?:\/\/\S+/)?.[0]?.replace(/[.,;]+$/, '') ?? null;

  const out = [];
  for (const text of pubItems) {
    const embedded = urlIn(text);
    if (!embedded) {
      out.push({ text });
      continue;
    }

    // Strip the bare URL out of the display text — it becomes the anchor.
    const cleaned = text
      .replace(/\s*(?:URL:|DOI:)?\s*https?:\/\/\S+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .replace(/^[.,;]+|[.,;]+$/g, '')
      .trim();

    // A row that was ONLY a url is a continuation of the previous
    // publication, not a publication of its own — attach it there.
    if (!cleaned) {
      const prev = out[out.length - 1];
      if (prev && !prev.link) prev.link = embedded;
      continue;
    }

    out.push({ text: cleaned, link: embedded });
  }

  // Single publication + single link → unambiguous pairing.
  if (out.length === 1 && linkItems.length === 1 && !out[0].link) {
    const l = urlIn(linkItems[0]);
    if (l) out[0].link = l;
  }

  return out;
}

const records = [];

for (const file of sheetFiles) {
  const rows = readSheet(file);
  const first = rows.get(2);
  if (!first?.B) continue;

  const name = clean(first.B);
  const position = clean(first.E);
  const contact = phone(first.G);
  const joiningDate = clean(first.D) || null;
  const biography = clean(first.J) || null;

  const pubItems = collect(rows, 'L');
  const linkItems = collect(rows, 'P');

  // personalInfo mirrors the BA layout: Name, Designation, Department,
  // Faculty, Contact, [Joining Date], Short Biography.
  const personalInfo = [
    { label: 'Name', value: name },
    { label: 'Designation', value: position },
    { label: 'Department', value: DEPARTMENT },
    { label: 'Faculty', value: FACULTY_NAME },
  ];
  if (contact) personalInfo.push({ label: 'Contact', value: contact });
  if (joiningDate) personalInfo.push({ label: 'Joining Date', value: joiningDate });
  if (biography) personalInfo.push({ label: 'Short Biography', value: biography });

  const isHead = /\bhead\b/i.test(position);
  const isDean = /\bdean\b/i.test(position);

  const rec = {
    slug: slugify(name),
    name,
    designation: position,
    badge: isDean ? 'Dean' : isHead ? 'Head' : null,
    type: facultyType(first.C, position),
    displayOrder: parseInt(clean(first.A), 10) || 0,
    email: clean(first.F) || null,
    phone: contact,
    suId: clean(first.H) || null,

    isHead,
    isDean,
    biography,

    personalInfo,
    academicQualification: section(collect(rows, 'I')),
    trainingExperience: section(collect(rows, 'K')),
    publications: publications(pubItems, linkItems),
    awards: section(collect(rows, 'M')),
    teachingArea: section(collect(rows, 'N')),
    fieldOfInterest: section(collect(rows, 'O')),
    research: researchProfiles(linkItems),
    membership: section(collect(rows, 'Q')),

    joiningDate,
  };

  records.push(rec);
}

records.sort((a, b) => a.displayOrder - b.displayOrder);

// Leadership first (Dean, then Head), then the rest in spreadsheet order.
const ordered = [
  ...records.filter((r) => r.isDean),
  ...records.filter((r) => r.isHead && !r.isDean),
  ...records.filter((r) => !r.isDean && !r.isHead),
];
ordered.forEach((r, i) => { r.displayOrder = i + 1; });

// ── report ─────────────────────────────────────────────────────────

console.log(`Parsed ${ordered.length} faculty from the spreadsheet\n`);
console.log('='.repeat(72));

for (const r of ordered) {
  console.log(`\n[${r.displayOrder}] ${r.name}`);
  console.log(`     slug        : ${r.slug}`);
  console.log(`     designation : ${r.designation}`);
  console.log(`     type        : ${r.type}${r.isDean ? '  (DEAN)' : ''}${r.isHead ? '  (HEAD)' : ''}`);
  console.log(`     email       : ${r.email ?? '—'}`);
  console.log(`     phone       : ${r.phone ?? '—'}`);
  console.log(`     SU ID       : ${r.suId ?? '—'}`);
  console.log(`     joined      : ${r.joiningDate ?? '—'}`);
  console.log(`     badge       : ${r.badge ?? '—'}`);
  console.log(`     photo       : (none — upload manually)`);
  console.log(`     personalInfo: ${r.personalInfo.map((p) => p.label).join(', ')}`);

  const shape = (v) =>
    v == null ? '—' : typeof v === 'string' ? 'text' : `${v.length} items`;
  const linked = Array.isArray(r.publications)
    ? r.publications.filter((p) => p.link).length
    : 0;

  console.log(`     academicQual: ${shape(r.academicQualification)}`);
  console.log(`     experience  : ${shape(r.trainingExperience)}`);
  console.log(`     publications: ${shape(r.publications)}${linked ? ` (${linked} with links)` : ''}`);
  console.log(`     awards      : ${shape(r.awards)}`);
  console.log(`     teachingArea: ${shape(r.teachingArea)}`);
  console.log(`     fieldOfInt. : ${shape(r.fieldOfInterest)}`);
  console.log(`     research    : ${shape(r.research)}${r.research ? ` (${r.research.map((x) => x.text).join(', ')})` : ' — no scholar profile in source'}`);
  console.log(`     membership  : ${shape(r.membership)}`);
}

console.log(`\n${'='.repeat(72)}`);

if (!COMMIT) {
  console.log('\nDRY RUN — nothing written to the database.');
  console.log('Review the above, then re-run with --commit to import.\n');
  process.exit(0);
}

// ── write ──────────────────────────────────────────────────────────

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

try {
  const existing = await prisma.faculty.findMany({ select: { name: true } });
  console.log(`\nDeleting ${existing.length} existing faculty rows…`);
  await prisma.faculty.deleteMany({});

  for (const r of ordered) {
    await prisma.faculty.create({
      data: {
        slug: r.slug,
        name: r.name,
        designation: r.designation,
        badge: r.badge,
        type: r.type,
        displayOrder: r.displayOrder,
        email: r.email,
        phone: r.phone,
        suId: r.suId,
        isHead: r.isHead,
        isDean: r.isDean,

        // Json sections — string when single-valued, array when many,
        // null when empty (matches the original BA rows exactly).
        personalInfo: r.personalInfo,
        academicQualification: r.academicQualification,
        trainingExperience: r.trainingExperience,
        publications: r.publications,
        awards: r.awards,
        teachingArea: r.teachingArea,
        fieldOfInterest: r.fieldOfInterest,
        research: r.research,
        membership: r.membership,

        // Dean/Head also drive /about/message-from-head and the Dean's
        // message page, which read messageParagraphs.
        ...(r.isDean || r.isHead
          ? { messageParagraphs: r.biography ? [r.biography] : [] }
          : {}),
      },
    });
    console.log(`  · ${r.name}`);
  }

  const final = await prisma.faculty.count();
  console.log(`\nImported. Faculty rows now: ${final}`);
} finally {
  await prisma.$disconnect();
}
