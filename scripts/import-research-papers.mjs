/**
 * Replace the inherited Business-Administration research papers with the
 * Department of Law's own, read from the department's spreadsheet.
 *
 * The 40 rows currently in ResearchPaper all belong to BA staff and
 * carry facultySlug values (shoriful-islam, rasel-hawlader, …) that no
 * longer resolve, so every author link on /research is broken.
 *
 * Three corrections were agreed with the department because the source
 * file contradicts itself. Each is implemented below and reported by the
 * dry run, so nothing is silently "fixed":
 *
 *  1. The "Tariq Iqbal" sheet holds Md. Sagor Hossain's paper (his name
 *     is not among its authors, and the identical entry appears on the
 *     Sagor Hossain sheet). His own paper — "The Paradox of Flexibility"
 *     — is absent from this file. That sheet is skipped and the real
 *     paper is carried over from the previously imported faculty data.
 *
 *  2. Sharmin Jahan Runa's first row pairs the BiLD Law Journal title
 *     with the DOI, URL, journal name and keywords of a DIFFERENT paper
 *     of hers (Road Accident, row 8) — leftover sample metadata. That
 *     row keeps its title; the mismatched metadata is dropped rather
 *     than pointing readers at the wrong article.
 *
 *  3. Sagor Hossain's last three entries are typed "Journal" but carry
 *     ISBNs and law-book publishers. They are recorded as books.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/import-research-papers.mjs
 *   node --env-file=.env scripts/import-research-papers.mjs --commit
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const SRC = String.raw`C:\Users\Nabid Ahamed Noushad\Downloads\Research_and_Publications_Template-2-db6e0f017e442feaf75670436157c8d4.xlsx`;
const COMMIT = process.argv.includes('--commit');

// ── xlsx reading (dependency-free: unzip + parse the XML parts) ──────

const WORK = path.join(process.env.TEMP ?? '.', 'law-pub-import');
if (existsSync(WORK)) rmSync(WORK, { recursive: true, force: true });

// Read through a copy: Excel holds an exclusive lock on an open
// workbook, and ExtractToDirectory then fails with "the process cannot
// access the file". copyFileSync is allowed against that lock.
const LOCAL = path.join(process.env.TEMP ?? '.', 'law-pub-source.xlsx');
copyFileSync(SRC, LOCAL);

execSync(
  `powershell -NoProfile -Command "Add-Type -A System.IO.Compression.FileSystem; ` +
    `[System.IO.Compression.ZipFile]::ExtractToDirectory('${LOCAL}','${WORK}')"`,
);

const dec = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const ssPath = path.join(WORK, 'xl', 'sharedStrings.xml');
const shared = existsSync(ssPath)
  ? [...readFileSync(ssPath, 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
      [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => dec(t[1])).join(''),
    )
  : [];

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

// Sheet order matches the workbook: one sheet per researcher.
const SHEET_NAMES = [...readFileSync(path.join(WORK, 'xl', 'workbook.xml'), 'utf8')
  .matchAll(/<sheet name="([^"]+)"/g)].map((m) => dec(m[1]));

// ── cleaning ────────────────────────────────────────────────────────

const clean = (s) => (s ?? '').replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();

/** "no", "No", "N/A", "-" and blanks all mean "not supplied". */
function meaningful(v) {
  const t = clean(v);
  if (!t) return null;
  if (/^(no|n\/a|na|none|-|nil)$/i.test(t)) return null;
  // Journal names are often typed with the trailing comma from the
  // citation they were copied out of.
  return t.replace(/[,.\s]+$/, '');
}

/**
 * A url that runs a site search for the author rather than addressing
 * one paper — e.g. ijaresm.com/search?...&keyword2=Md.+Sagor+Hossain.
 * Its results change over time and may list other people's work, so it
 * is not a citation link. Note `keyword2`: the query key can carry a
 * numeric suffix, so match a prefix, not an exact key.
 */
function isSearchUrl(u) {
  return /\/search\b/i.test(u) || /[?&](keyword|search|query|q|s)\d*=/i.test(u);
}

/**
 * Pull the first url out of a cell that may read "DOI: https://…".
 * Site-search urls are rejected — see isSearchUrl above.
 */
function url(v) {
  const t = meaningful(v);
  if (!t) return null;
  const m = t.match(/https?:\/\/[^\s<>]+/);
  if (!m) return null;
  const u = m[0].replace(/[.,;<>]+$/, '');
  return isSearchUrl(u) ? null : u;
}

/** Strip the leading "1.  " / "7. " numbering the source uses. */
const stripNumber = (s) => clean(s).replace(/^\d+\s*\.\s*/, '');

/**
 * Several rows leave columns G/H empty and instead bury the DOI and url
 * inside the title cell — "…8(1): 13-24. DOI: <10.36348/…> URL: https://…".
 * Recover both, and return the title without them so the citation reads
 * cleanly on the page.
 *
 * A bare DOI (no scheme) is expanded to a resolvable https://doi.org/
 * url; anything that is not a DOI or http url is left in the title
 * rather than guessed at.
 */
function extractInlineLinks(title) {
  let link = null;

  // "DOI: <10.36348/sijlcj.2025.v08i01.002>" or "DOI: https://doi.org/…".
  // The alternation must try the full url FIRST and match it greedily —
  // a non-greedy \S+? stops at the first character and yields "https://d".
  const doiMatch = title.match(/DOI:\s*<?\s*(https?:\/\/[^\s<>]+|10\.\d{4,9}\/[^\s<>,;]+)\s*>?/i);
  if (doiMatch) {
    const raw = doiMatch[1].replace(/[.,;<>]+$/, '');
    link = /^https?:/i.test(raw) ? raw : `https://doi.org/${raw}`;
  }

  const urlMatch = title.match(/URL:\s*(https?:\/\/[^\s<>]+)/i);
  const plainUrl = urlMatch ? urlMatch[1].replace(/[.,;<>]+$/, '') : null;

  // Prefer the DOI — it outlives the publisher's own url.
  link ??= plainUrl;

  // Some citations end with a bare url and no "DOI:"/"URL:" label at
  // all, e.g. "…, 6(10), 545–556. https://doi.org/10.36348/…".
  if (!link) {
    const bare = title.match(/https?:\/\/[^\s<>]+/);
    if (bare) link = bare[0].replace(/[.,;<>]+$/, '');
  }

  // A site-search url is not this paper's address — it just runs a query
  // for the author's name and would land readers on a result list that
  // changes over time. Better no link than a misleading one.
  if (link && isSearchUrl(link)) link = null;

  const cleaned = title
    .replace(/\s*DOI:\s*<?\s*(?:https?:\/\/[^\s<>]+|10\.\d{4,9}\/[^\s<>,;]+)\s*>?/gi, '')
    .replace(/\s*URL:\s*https?:\/\/[^\s<>]+/gi, '')
    // …and any remaining bare url, so no raw address is left sitting in
    // the citation text on the page.
    .replace(/\s*https?:\/\/[^\s<>]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: cleaned, link };
}

/** Books are typed "Journal" in the source; detect them by evidence. */
function isBook(title, publisher, volume) {
  const hay = `${title} ${publisher ?? ''} ${volume ?? ''}`;
  return /\bISBN\b/i.test(hay) || /book\s*house|book\s*therapy/i.test(publisher ?? '');
}

// ── decisions agreed with the department ────────────────────────────

// 1. Sheet whose contents belong to someone else — skipped entirely.
const SKIP_SHEETS = new Set(['Tariq Iqbal']);

// 1b. …and replaced by his real paper, carried over from the faculty
// import. Both the article url and its DOI are recorded.
const TARIQ_PAPER = {
  title:
    'Chowdhury, J., & Iqbal, A. S. M. T. (2025). The Paradox of Flexibility: A Socio-Legal Appraisal of Gig Workers’ Rights and Protections in Bangladesh. Legal Research & Analysis, 3(2), 37–40.',
  authors: 'Dr. A. S. M. Tariq Iqbal',
  authorRole: 'Professor & Dean',
  facultySlug: 'dr-a-s-m-tariq-iqbal',
  publisher: 'Legal Research & Analysis',
  volume: '3(2), pp. 37–40',
  year: 2025,
  link: 'https://doi.org/10.69971/lra.3.2.2025.1333',
  indexing: null,
  coAuthors: 'Joydeep Chowdhury',
  note: 'carried over — not present in this spreadsheet',
};

// 2. Row whose DOI/URL/journal/keywords belong to a different paper.
// Matched on the title so a re-ordered sheet cannot silently re-apply
// it to the wrong row.
const DROP_METADATA_FOR = /Challenges of Freedom of Expression and the Digital Security Act/i;

// ── build ───────────────────────────────────────────────────────────

const prisma = new PrismaClient();
try {
  const faculty = await prisma.faculty.findMany({
    select: { name: true, slug: true, designation: true },
  });
  const norm = (s) => clean(s).toLowerCase().replace(/[^a-z]/g, '');

  /** Map a sheet's researcher name onto a Faculty row, or null. */
  function matchFaculty(rawName) {
    const n = norm(rawName);
    if (!n) return null;
    return (
      faculty.find((f) => norm(f.name) === n) ??
      // "Tariq Iqbal" vs "Dr. A. S. M. Tariq Iqbal", "Sunzida Akter"
      // vs the sheet's "Akhter" spelling — fall back to containment.
      faculty.find((f) => norm(f.name).includes(n) || n.includes(norm(f.name))) ??
      null
    );
  }

  const papers = [];
  const notes = [];

  for (const [i, sheetName] of SHEET_NAMES.entries()) {
    const n = i + 1;

    if (SKIP_SHEETS.has(sheetName)) {
      notes.push(
        `SKIPPED sheet "${sheetName}" — its single row is Md. Sagor Hossain's paper ` +
          `(duplicated on his own sheet); Tariq Iqbal is not an author.`,
      );
      continue;
    }

    const rows = readSheet(n);
    const header = rows.find((r) => r.r === 1);
    if (!header) continue;

    // Researcher identity lives only on the first data row; later rows
    // leave columns A–C blank and inherit it.
    const first = rows.find((r) => r.r === 2);
    const rawName = first?.cells['A'] ?? sheetName;
    const role = meaningful(first?.cells['B']);
    const member = matchFaculty(rawName);

    if (!member) {
      notes.push(`!! sheet "${sheetName}" — no matching faculty row; authors will not link.`);
    }

    for (const row of rows) {
      if (row.r === 1) continue;
      const rawTitle = stripNumber(row.cells['D']);
      if (!rawTitle) continue;
      const { title, link: inlineLink } = extractInlineLinks(rawTitle);

      const dropMeta = DROP_METADATA_FOR.test(title);
      if (dropMeta) {
        notes.push(
          `CLEARED metadata on "${title.slice(0, 60)}…" — its DOI/URL/journal/keywords ` +
            `belong to a different paper by the same author (Road Accident, row 8).`,
        );
      }

      const publisher = dropMeta ? null : meaningful(row.cells['I']);
      const volume = dropMeta ? null : meaningful(row.cells['J']);
      const indexing = dropMeta ? null : meaningful(row.cells['K']);
      const coAuthors = meaningful(row.cells['L']);
      const yearRaw = meaningful(row.cells['F']);
      const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;

      // Prefer the DOI (permanent) over the publisher's own url. The
      // dedicated columns win over anything recovered from the title,
      // since those were entered deliberately.
      const link = dropMeta
        ? null
        : (url(row.cells['G']) ?? url(row.cells['H']) ?? inlineLink);

      // Report anything the source offered but we refused, so a dropped
      // link is a visible decision rather than a silent omission.
      if (!dropMeta && !link && /https?:\/\//.test(`${rawTitle} ${row.cells['G'] ?? ''} ${row.cells['H'] ?? ''}`)) {
        notes.push(
          `NO LINK for "${title.slice(0, 55)}…" — the only url supplied is a site-search ` +
            `query, not this paper's address.`,
        );
      }

      const book = isBook(title, publisher, volume);

      papers.push({
        title,
        authors: member?.name ?? clean(rawName).replace(/,$/, ''),
        authorRole: role ?? member?.designation ?? null,
        facultySlug: member?.slug ?? null,
        publisher,
        volume,
        indexing,
        coAuthors,
        year,
        link,
        kind: book ? 'Book' : 'Journal',
        sheet: sheetName,
      });
    }
  }

  // Tariq's real paper takes the place his skipped sheet would have had.
  papers.unshift({
    title: TARIQ_PAPER.title,
    authors: TARIQ_PAPER.authors,
    authorRole: TARIQ_PAPER.authorRole,
    facultySlug: TARIQ_PAPER.facultySlug,
    publisher: TARIQ_PAPER.publisher,
    volume: TARIQ_PAPER.volume,
    indexing: TARIQ_PAPER.indexing,
    coAuthors: TARIQ_PAPER.coAuthors,
    year: TARIQ_PAPER.year,
    link: TARIQ_PAPER.link,
    kind: 'Journal',
    sheet: `(${TARIQ_PAPER.note})`,
  });

  // `area` is a stored summary of the row (publisher · indexing). The
  // public page reads `publisher` and `indexing` directly and never
  // renders `area`, so it exists only as a human-readable label in the
  // admin list and DB.
  function areaFor(p) {
    const bits = [p.publisher, p.indexing].filter(Boolean);
    if (p.kind === 'Book') bits.unshift('Book');
    return bits.join(' · ') || p.kind;
  }

  /**
   * `indexing` is the only free-text field that renders as a pill on
   * /research, so it is where a book earns a visible "Book" badge —
   * without it a textbook is indistinguishable from a journal article.
   * Journal rows keep whatever indexing the source declared.
   */
  function indexingFor(p) {
    if (p.kind !== 'Book') return p.indexing;
    return p.indexing ? `Book · ${p.indexing}` : 'Book';
  }

  // ── report ────────────────────────────────────────────────────────

  const existing = await prisma.researchPaper.count();

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');
  console.log(`DELETE ${existing} existing rows (all Business Administration staff)\n`);

  const bySheet = {};
  for (const p of papers) (bySheet[p.sheet] ??= []).push(p);

  let idx = 0;
  for (const [sheet, list] of Object.entries(bySheet)) {
    console.log(`--- ${sheet}  (${list.length})`);
    for (const p of list) {
      idx++;
      console.log(`  ${String(idx).padStart(2)}. [${p.kind}] ${p.title.slice(0, 110)}`);
      console.log(`      author : ${p.authors}${p.facultySlug ? ` → /faculty-member/${p.facultySlug}` : '   (NO PROFILE LINK)'}`);
      console.log(`      area   : ${areaFor(p)}`);
      console.log(`      pill   : ${indexingFor(p) ?? '—'}`);
      console.log(`      year   : ${p.year ?? '—'}    link: ${p.link ?? '—'}`);
    }
    console.log();
  }

  console.log(`TOTAL: ${papers.length} papers`);
  const noLink = papers.filter((p) => !p.link).length;
  const noSlug = papers.filter((p) => !p.facultySlug).length;
  console.log(`  · ${papers.filter((p) => p.kind === 'Book').length} recorded as books`);
  console.log(`  · ${noLink} without any url (source supplied none)`);
  console.log(`  · ${noSlug} without a faculty profile link`);

  if (notes.length) {
    console.log('\nCORRECTIONS APPLIED:');
    for (const nte of notes) console.log(`  • ${nte}`);
  }

  const missing = faculty.filter((f) => !papers.some((p) => p.facultySlug === f.slug));
  if (missing.length) {
    console.log('\nFACULTY WITH NO PAPERS IN THIS FILE:');
    for (const m of missing) console.log(`  • ${m.name}`);
  }

  if (COMMIT) {
    await prisma.$transaction([
      prisma.researchPaper.deleteMany({}),
      ...papers.map((p, i) =>
        prisma.researchPaper.create({
          data: {
            title: p.title,
            authors: p.authors,
            authorRole: p.authorRole,
            facultySlug: p.facultySlug,
            area: areaFor(p),
            date: p.year ? String(p.year) : null,
            publicationYear: p.year,
            link: p.link,
            displayOrder: i,
            publisher: p.publisher,
            indexing: indexingFor(p),
          },
        }),
      ),
    ]);
    const after = await prisma.researchPaper.count();
    console.log(`\nReplaced. ResearchPaper rows now: ${after}`);
  }
} finally {
  await prisma.$disconnect();
}
