/**
 * Adds the "LL.B (2-year) programme" FAQ supplied by the department.
 *
 * Placed at the end of the Admission block rather than appended to the
 * list: displayOrder groups the categories on the public page, so a
 * new Admission entry at order 25 would render under Exams. Everything
 * from the first Rankings row onward shifts down by one.
 *
 * Re-running is safe — the question is matched on its text and updated
 * in place, and the shift only happens when the row is new.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

const FAQ = {
  category: 'Admission',
  question: 'Is the LL.B (2-year) program available? What is the cost?',
  answer:   'We apologize, but our 2-year LLM/LL.B programs are currently closed.',
};

// Last Admission row today; the new entry goes directly after it.
const INSERT_AT = 6;

const p = new PrismaClient();

const existing = await p.faq.findFirst({ where: { question: FAQ.question } });
const toShift = await p.faq.findMany({
  where: { displayOrder: { gte: INSERT_AT } },
  select: { id: true, question: true, displayOrder: true },
  orderBy: { displayOrder: 'asc' },
});

console.log(`total FAQs now      : ${await p.faq.count()}`);
console.log(`already present     : ${existing ? 'yes — will update in place' : 'no — will insert'}`);
console.log(`inserting at order  : ${INSERT_AT} (end of the Admission block)`);
console.log(`rows shifted by +1  : ${existing ? 0 : toShift.length}\n`);
console.log(`  [${FAQ.category}] ${FAQ.question}`);
console.log(`     ${FAQ.answer}`);

if (COMMIT) {
  if (existing) {
    await p.faq.update({ where: { id: existing.id }, data: FAQ });
  } else {
    // Shift downward first, highest order first, so the unique-free
    // integer column never collides mid-update.
    for (const row of [...toShift].reverse()) {
      await p.faq.update({
        where: { id: row.id },
        data: { displayOrder: row.displayOrder + 1 },
      });
    }
    await p.faq.create({ data: { ...FAQ, displayOrder: INSERT_AT } });
  }
  console.log(`\nwritten — ${await p.faq.count()} FAQs on the page.`);
} else {
  console.log('\ndry run — pass --commit to apply.');
}
await p.$disconnect();
