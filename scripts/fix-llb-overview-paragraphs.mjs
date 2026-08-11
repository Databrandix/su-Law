/**
 * Joins an overview stored as mid-sentence fragments back into whole
 * paragraphs.
 *
 * Pasting from a PDF or Word document carries the source's *line*
 * breaks, so the text arrives split like this:
 *
 *   [0] "…titled Bachelor of Laws (LLB) in"      <- sentence continues
 *   [1] "Law. The program will make the students…"
 *
 * The page puts `space-y-5` between entries, so every one of those line
 * breaks renders as a paragraph gap — which is why the first lines look
 * loosely spaced while a correctly-stored paragraph below them is tight.
 *
 * Rule: an entry that does NOT end in sentence-ending punctuation is a
 * continuation, so the next entry is glued onto it. Entries that already
 * end a sentence stay separate paragraphs, so genuine paragraph breaks
 * are preserved.
 *
 * A guard compares the prose before and after with whitespace
 * normalised and refuses to write if a single character would change.
 *
 * Usage:  node scripts/fix-llb-overview-paragraphs.mjs [slug] [--commit]
 * Default slug is "llb"; pass another to fix a different programme.
 */
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const SLUG = args.find((a) => !a.startsWith('--')) ?? 'llb';

/** Join fragments whose sentence runs on into the next entry. */
function joinFragments(entries) {
  const out = [];
  let buf = '';
  for (const raw of entries) {
    const s = String(raw).trim();
    if (!s) continue;
    buf = buf ? `${buf} ${s}` : s;
    // Sentence-ending punctuation, allowing a trailing quote/bracket.
    if (/[.!?][)"'\]]?$/.test(buf)) {
      out.push(buf.replace(/\s+/g, ' ').trim());
      buf = '';
    }
  }
  if (buf) out.push(buf.replace(/\s+/g, ' ').trim());
  return out;
}

const p = new PrismaClient();
const row = await p.program.findUnique({
  where: { slug: SLUG },
  select: { slug: true, programName: true, overviewParagraphs: true },
});
if (!row) { console.error(`No program with slug "${SLUG}"`); process.exit(1); }

const before = Array.isArray(row.overviewParagraphs)
  ? row.overviewParagraphs.filter((s) => typeof s === 'string')
  : [];

console.log(`${row.programName} (${row.slug})\n`);
console.log(`before: ${before.length} entr(ies)`);
before.forEach((s, i) => console.log(`  [${i}] ${s.slice(0, 96)}${s.length > 96 ? '…' : ''}`));

const after = joinFragments(before);

console.log(`\nafter : ${after.length} paragraph(s)`);
after.forEach((s, i) => console.log(`  [${i}] ${s.slice(0, 96)}${s.length > 96 ? '…' : ''}`));

// Guard: structure may change, wording may not.
const norm = (a) => a.join(' ').replace(/\s+/g, ' ').trim();
if (norm(before) !== norm(after)) {
  console.error('\nABORT — text would change. Refusing to write.');
  console.error('before:', norm(before).slice(0, 200));
  console.error('after :', norm(after).slice(0, 200));
  process.exit(1);
}
console.log('\ntext identical after normalising whitespace ✓');

if (before.length === after.length) {
  console.log('nothing to merge — already stored as whole paragraphs.');
} else if (COMMIT) {
  await p.program.update({
    where: { slug: SLUG },
    data: { overviewParagraphs: after },
  });
  console.log(`written — ${before.length} → ${after.length}.`);
} else {
  console.log('dry run — pass --commit to apply.');
}
await p.$disconnect();
