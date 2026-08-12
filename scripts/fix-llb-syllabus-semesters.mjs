/**
 * Corrects the LL.B syllabus entry, which described the programme as
 * "4 Years · 12 Semesters".
 *
 * WHY IT WAS WRONG: the figure was taken from the uploaded file's NAME
 * ("...4 year_12  Semester(1)(2)(1).doc.pdf"), not from the document.
 * Page 1 of that PDF is a cover reading only "Department of Law /
 * Syllabus of LLB (Hon's) Program" — it states no semester count, so
 * the filename was never corroborated.
 *
 * WHY 8 IS RIGHT: the curriculum workbook lists the LL.B under exactly
 * eight semesters (1st Year 1st Semester … 4th Year 2nd Semester),
 * 44 courses totalling 144 credits, and Program.duration already reads
 * "4 Years · 8 Semesters". The department confirmed 8.
 *
 * Only the two strings carrying the wrong number change. The PDF, its
 * public id, the slug, title and ordering are untouched — the document
 * itself was always correct; only our description of it was not.
 *
 * pdfFileName is the human label shown beside the download, not the
 * stored filename, so correcting it cannot break the link.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const SLUG = 'llb-honours';

const NEW_FILE_NAME = 'Detail Syllabus of LLB (Honours) 4 Year 8 Semester';
const NEW_SUMMARY =
  'Detailed course-by-course syllabus for the LL.B (Honours) programme (4 Years · 8 Semesters).';

const prisma = new PrismaClient();

const row = await prisma.syllabus.findUnique({
  where: { slug: SLUG },
  select: { id: true, title: true, pdfFileName: true, summary: true, pdfUrl: true },
});

if (!row) {
  console.error(`ABORT — no syllabus row with slug "${SLUG}".`);
  await prisma.$disconnect();
  process.exit(1);
}

// Cross-check against the programme page so the two can never disagree
// again: whatever duration the LL.B programme states is the authority.
const program = await prisma.program.findUnique({
  where: { slug: 'llb' },
  select: { duration: true, courses: true },
});
const courses = Array.isArray(program?.courses) ? program.courses : [];
const semesterCount = new Set(courses.map((c) => c?.semester)).size;

console.log(`syllabus : ${row.title}`);
console.log(`  pdfFileName : ${row.pdfFileName}`);
console.log(`             -> ${NEW_FILE_NAME}`);
console.log(`  summary     : ${row.summary}`);
console.log(`             -> ${NEW_SUMMARY}`);
console.log(`\ncross-check (unchanged, for confirmation):`);
console.log(`  Program.duration       : ${program?.duration ?? '(no llb program row)'}`);
console.log(`  distinct semesters in curriculum : ${semesterCount}`);

if (semesterCount !== 8) {
  console.error(
    `\nABORT — the curriculum holds ${semesterCount} semesters, not 8.` +
      '\n        Refusing to write a number the course data does not support.',
  );
  await prisma.$disconnect();
  process.exit(1);
}

if (row.pdfFileName === NEW_FILE_NAME && row.summary === NEW_SUMMARY) {
  console.log('\nalready correct — nothing to do.');
  await prisma.$disconnect();
  process.exit(0);
}

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.syllabus.update({
  where: { slug: SLUG },
  data: { pdfFileName: NEW_FILE_NAME, summary: NEW_SUMMARY },
});
console.log('\nwritten.');
await prisma.$disconnect();
