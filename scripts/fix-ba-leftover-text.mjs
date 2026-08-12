/**
 * Phase 1 — replaces Business-Administration wording left over from the
 * template with the Law department's own.
 *
 * TEXT ONLY. Nothing here deletes a page, a club, or an image; those
 * need a decision from the department and are handled separately.
 *
 * DELIBERATELY NOT TOUCHED
 *   The two university-wide notices ("Spring-2026 Semester Break",
 *   "Pre-registration Notice for Summer-2026") name BBA/MBA/EMBA among
 *   many departments — one of them names Law too. They are accurate
 *   announcements about the whole university, not leftovers, so
 *   rewriting them would falsify the department's own notice board.
 *
 * The department name is read from DepartmentIdentity rather than typed
 * here, so this cannot invent a name the department does not use.
 *
 * Every change is checked against the value actually in the database:
 * a row that has already been edited, or that does not hold the
 * expected text, is reported and skipped rather than overwritten.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const identity = await prisma.departmentIdentity.findFirst();
if (!identity?.name) {
  console.error('DepartmentIdentity.name is empty — cannot derive the department name.');
  await prisma.$disconnect();
  process.exit(1);
}
const DEPT = identity.name;                       // "Department of Law"
const SUBJECT = identity.programName || 'Law';    // "Law"

/** Each edit states the value it expects, so a surprise aborts it. */
const plan = [];

function edit(label, model, where, field, expected, next) {
  plan.push({ label, model, where, field, expected, next });
}

// ── Hero image alt text ──────────────────────────────────────────────
// Invisible on screen but read aloud by screen readers and indexed by
// search engines, so it describes the wrong department to exactly the
// audiences that cannot see the page.
edit('Hero image 1 alt', 'departmentIdentity', { id: identity.id },
  'heroImage1Alt',
  'Sonargaon University Bachelor of Business Administration Campus',
  `Sonargaon University ${DEPT} campus`);

edit('Hero image 2 alt', 'departmentIdentity', { id: identity.id },
  'heroImage2Alt',
  'Sonargaon University Bachelor of Business Administration',
  `Sonargaon University ${DEPT}`);

edit('Hero image 3 alt', 'departmentIdentity', { id: identity.id },
  'heroImage3Alt',
  'Sonargaon University Bachelor of Business Administration students and faculty',
  `Sonargaon University ${DEPT} students and faculty`);

// ── Homepage overview image ──────────────────────────────────────────
const overview = await prisma.homeOverview.findFirst();
if (overview) {
  edit('Home overview image alt', 'homeOverview', { id: overview.id },
    'imageAlt',
    'Sonargaon University Business Administration students',
    `Sonargaon University ${SUBJECT} students`);
}

// ── Page subtitles printed under the heading ─────────────────────────
const newsLanding = await prisma.newsLanding.findFirst();
if (newsLanding) {
  edit('News page subtitle', 'newsLanding', { id: newsLanding.id },
    'heroSubtitle', 'Department of Business Administration', DEPT);
}

const newsletter = await prisma.newsletterPage.findFirst();
if (newsletter) {
  edit('Newsletter page subtitle', 'newsletterPage', { id: newsletter.id },
    'heroSubtitle', 'Department of Business Administration', DEPT);
}

// ── Club description ─────────────────────────────────────────────────
// Only the department reference is rewritten. The activities it lists
// are the club's own and are left exactly as written; whether this club
// belongs on a Law site at all is a separate decision.
const club = await prisma.club.findUnique({ where: { slug: 'business' } });
if (club?.description?.startsWith('Representing the Department of Business Administration,')) {
  edit('Business club description', 'club', { slug: 'business' },
    'description',
    club.description,
    club.description.replace(
      'Representing the Department of Business Administration,',
      `Representing the ${DEPT},`,
    ));
}

// ── Prospectus card ──────────────────────────────────────────────────
// The card renders shortTitle as its heading and department beneath;
// both already read correctly. Only `title` still says "Business
// Administration", and it is what the cover image's alt text and the
// site search use — so it becomes a description of the document rather
// than a copy of shortTitle, which would print the same line twice.
const pe = await prisma.prospectusEntry.findFirst({ where: { slug: 'business-administration' } });
if (pe) {
  edit('Prospectus title (alt text + search)', 'prospectusEntry', { id: pe.id },
    'title', 'Business Administration', `${DEPT} Prospectus`);
}

// ── Report ───────────────────────────────────────────────────────────
let willWrite = 0;
let skipped = 0;

console.log(`Department name in use: "${DEPT}"\n`);

for (const p of plan) {
  const row = await prisma[p.model].findFirst({ where: p.where });
  const actual = row?.[p.field];

  if (actual === p.next) {
    console.log(`  =  ${p.label} — already correct, skipping`);
    skipped++;
    continue;
  }
  if (actual !== p.expected) {
    console.log(`  !  ${p.label} — UNEXPECTED value, skipping`);
    console.log(`       expected: ${JSON.stringify(p.expected)?.slice(0, 90)}`);
    console.log(`       found   : ${JSON.stringify(actual)?.slice(0, 90)}`);
    skipped++;
    continue;
  }
  console.log(`  →  ${p.label}`);
  console.log(`       from: ${JSON.stringify(p.expected).slice(0, 100)}`);
  console.log(`       to  : ${JSON.stringify(p.next).slice(0, 100)}`);
  willWrite++;
}

console.log(`\n${willWrite} to change, ${skipped} skipped.`);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

let written = 0;
for (const p of plan) {
  const row = await prisma[p.model].findFirst({ where: p.where });
  if (row?.[p.field] !== p.expected) continue;
  await prisma[p.model].update({ where: p.where, data: { [p.field]: p.next } });
  written++;
}
console.log(`\nwritten: ${written}`);
await prisma.$disconnect();
