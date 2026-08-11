/**
 * Moves ">"-prefixed lines out of careerIntro and into careerRoles.
 *
 * The department's source form marks each career with a ">" bullet.
 * Pasting the whole block into the CMS's "Paragraphs" box stores those
 * lines as paragraphs, so the page renders a literal ">" in front of
 * each one and the styled role list stays empty.
 *
 * This splits them apart:
 *   careerIntro  — the prose before and after the list
 *   careerRoles  — the ">" lines, marker stripped, rendered as bullets
 *
 * Only the leading ">" (and any space after it) is removed. A guard
 * compares the wording before and after and refuses to write if a
 * single character of the text itself would change.
 *
 * Usage: node scripts/fix-career-role-bullets.mjs [slug…] [--commit]
 * With no slug, every programme is processed.
 */
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const slugs = args.filter((a) => !a.startsWith('--'));

const p = new PrismaClient();
const where = slugs.length ? { slug: { in: slugs } } : {};
const programs = await p.program.findMany({ where, orderBy: { displayOrder: 'asc' } });

let wrote = 0;

for (const prog of programs) {
  const intro = Array.isArray(prog.careerIntro)
    ? prog.careerIntro.filter((s) => typeof s === 'string')
    : [];
  if (intro.length === 0) continue;

  const isBullet = (s) => /^\s*>/.test(s);
  const strip = (s) => s.replace(/^\s*>\s*/, '').trim();

  const bullets = intro.filter(isBullet).map(strip).filter(Boolean);
  if (bullets.length === 0) {
    console.log(`${prog.slug}: no ">" lines — nothing to move.`);
    continue;
  }

  // Anything that is not a bullet stays as prose, in its original order.
  const prose = intro.filter((s) => !isBullet(s));

  console.log(`=== ${prog.slug} ===`);
  console.log(`  careerIntro : ${intro.length} -> ${prose.length}`);
  console.log(`  careerRoles : ${prog.careerRoles.length} -> ${bullets.length}`);
  prose.forEach((s, i) => console.log(`    prose[${i}] ${s.slice(0, 74)}${s.length > 74 ? '…' : ''}`));
  bullets.forEach((s, i) => console.log(`    role [${i}] ${s.slice(0, 74)}${s.length > 74 ? '…' : ''}`));

  // Guard: only the ">" markers may disappear; no line's wording may.
  // Compared as sorted multisets, because splitting the block moves the
  // closing paragraph after the roles — the order changes by design,
  // the text must not.
  const norm = (arr) =>
    arr.map((s) => s.replace(/^\s*>\s*/, '').replace(/\s+/g, ' ').trim())
       .filter(Boolean)
       .sort();
  const before = norm(intro);
  const after  = norm([...prose, ...bullets]);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    console.error('  ABORT — wording would change. Refusing to write.');
    const missing = before.filter((s) => !after.includes(s));
    const added   = after.filter((s) => !before.includes(s));
    if (missing.length) console.error('  lost :', missing.slice(0, 3));
    if (added.length)   console.error('  new  :', added.slice(0, 3));
    process.exit(1);
  }
  console.log(`  all ${before.length} lines identical once ">" is removed ✓`);

  if (COMMIT) {
    await p.program.update({
      where: { id: prog.id },
      data: { careerIntro: prose, careerRoles: bullets },
    });
    console.log('  written.');
    wrote++;
  }
}

console.log(COMMIT ? `\nwritten — ${wrote} programme(s).` : '\ndry run — pass --commit to apply.');
await p.$disconnect();
