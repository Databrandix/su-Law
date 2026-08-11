/**
 * Sets the LL.M curriculum note, supplied verbatim by the department.
 *
 * The workbook lists 21 courses totalling 61 credits against a stated
 * programme total of 36. The department clarified that this is by
 * design: the list is what the programme offers, and students take
 * twelve of them. Their wording is stored as-is rather than the page
 * inventing a sentence from the mismatched numbers.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const SLUG = 'llm';

// Verbatim from the department.
const NOTE =
  'Note: Students are required to take twelve courses (As per semester wise course offer, 18 credits per semester) from the following courses including Research Monograph in the 2nd semester.';

const p = new PrismaClient();
const row = await p.program.findUnique({
  where: { slug: SLUG },
  select: { programName: true, totalCredits: true, courses: true, curriculumNote: true },
});
if (!row) { console.error(`No program with slug "${SLUG}"`); process.exit(1); }

const listed = (Array.isArray(row.courses) ? row.courses : [])
  .reduce((t, c) => t + (Number(c.credits) || 0), 0);

console.log(`${row.programName} (${SLUG})`);
console.log(`  courses listed : ${Array.isArray(row.courses) ? row.courses.length : 0}  (${listed} credits)`);
console.log(`  stated total   : ${row.totalCredits ?? '—'}`);
console.log(`  note (current) : ${row.curriculumNote ?? '(none)'}`);
console.log(`  note (new)     : ${NOTE}`);

if (COMMIT) {
  await p.program.update({ where: { slug: SLUG }, data: { curriculumNote: NOTE } });
  console.log('\nwritten.');
} else {
  console.log('\ndry run — pass --commit to apply.');
}
await p.$disconnect();
