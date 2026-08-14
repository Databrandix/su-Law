/**
 * Two related faculty clean-ups, in one pass:
 *
 *  1. Retire published mobile numbers. The number lived in TWO places
 *     — the `phone` column (Contact panel) and a duplicate label/value
 *     row inside `personalInfo` (Personal Information accordion).
 *     Clearing only the column would leave the number on the page, so
 *     both are cleared here.
 *
 *  2. Give the Dean and Head the same bulleted Academic Qualification
 *     every other member has. Their rows store it as one comma-joined
 *     string; everyone else stores a string[]. Splitting the string
 *     into an array is all the public page needs — it already renders
 *     an array as a <ul>.
 *
 * The split is parenthesis-aware on purpose. A naive `split(',')` would
 * break "LL.M. in Business Law (LTU, UK)" into two bogus bullets at the
 * comma inside the brackets.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/retire-faculty-phone-and-split-qualifications.mjs
 *   node --env-file=.env scripts/retire-faculty-phone-and-split-qualifications.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

// Split on commas that sit at bracket depth 0, so a comma inside
// "(LTU, UK)" stays part of its bullet.
function splitTopLevel(text) {
  const parts = [];
  let buf = '';
  let depth = 0;
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
// eslint-disable-next-line no-continue
      continue;
    }
    buf += ch;
  }
  parts.push(buf);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

// A personalInfo row is a phone row when its label looks like one AND
// its value looks like a number. The label check alone is too greedy —
// "Contact" is also used for e-mail addresses on some rows.
function isPhoneRow(row) {
  if (!row || typeof row !== 'object') return false;
  const label = String(row.label ?? '');
  const value = String(row.value ?? '');
  const labelLooksPhone = /phone|mobile|cell|contact/i.test(label);
  const valueLooksPhone =
    /^[+\d][\d\s()+-]{7,}$/.test(value.trim()) && (value.match(/\d/g) ?? []).length >= 7;
  return labelLooksPhone && valueLooksPhone;
}

try {
  const rows = await prisma.faculty.findMany({
    orderBy: { displayOrder: 'asc' },
    select: {
      id: true, name: true, phone: true, isDean: true, isHead: true,
      academicQualification: true, personalInfo: true,
    },
  });

  console.log(COMMIT ? '\n=== COMMIT ===\n' : '\n=== DRY RUN (pass --commit to write) ===\n');

  const plan = [];

  for (const r of rows) {
    const update = {};
    const notes = [];

    if (r.phone) {
      update.phone = null;
      notes.push(`phone cleared (was ${r.phone})`);
    }

    if (Array.isArray(r.personalInfo)) {
      const kept = r.personalInfo.filter((p) => !isPhoneRow(p));
      if (kept.length !== r.personalInfo.length) {
        update.personalInfo = kept;
        const dropped = r.personalInfo.filter(isPhoneRow);
        notes.push(
          `personalInfo: dropped ${dropped.length} row(s) — ` +
            dropped.map((d) => `${d.label}="${d.value}"`).join(', '),
        );
      }
    }

    // Only the single-string rows need converting; anything already an
    // array is left exactly as it is.
    if (typeof r.academicQualification === 'string') {
      const bullets = splitTopLevel(r.academicQualification);
      if (bullets.length > 0) {
        update.academicQualification = bullets;
        notes.push(`academicQualification: 1 string → ${bullets.length} bullets`);
        bullets.forEach((b) => notes.push(`      • ${b}`));
      }
    }

    if (Object.keys(update).length > 0) plan.push({ id: r.id, name: r.name, update, notes });
  }

  for (const p of plan) {
    console.log(`${p.name}`);
    for (const n of p.notes) console.log(`   ${n}`);
    console.log();
  }

  if (!plan.length) console.log('Nothing to change.\n');

  if (COMMIT) {
    for (const p of plan) {
      await prisma.faculty.update({ where: { id: p.id }, data: p.update });
    }
    console.log(`Updated ${plan.length} faculty row(s).`);
  }
} finally {
  await prisma.$disconnect();
}
