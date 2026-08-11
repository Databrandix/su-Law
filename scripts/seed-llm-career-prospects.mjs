/**
 * Career Prospects for the LL.M programme, transcribed from the
 * department's "Departmental Website Content Submission Form"
 * (WPForms print preview, 8/6/26).
 *
 * Transcribed by hand from the supplied page image — there is no
 * machine-readable source for this one, so every line below is typed
 * from what the form shows and nothing is inferred or expanded.
 *
 * The first intro paragraph duplicates the programme overview already
 * stored in `overviewParagraphs`, so it is deliberately NOT repeated
 * here; this section starts from the sentence that introduces the role
 * list and ends with the closing paragraph.
 *
 * British spellings in the source ("organisations", "specialised") are
 * preserved as written.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const SLUG = 'llm';

// Lead-in sentence above the list.
const CAREER_INTRO = [
  'LL.M. graduates can pursue careers as:',
];

// The ">" bullets, in the order the form lists them.
const CAREER_ROLES = [
  'Advocates in the Supreme Court of Bangladesh and senior legal practitioners',
  'Judicial Officers and members of the Bangladesh Judicial Service',
  'Legal Advisors and Corporate Counsel in national and multinational organisations',
  'University Lecturers, Researchers, and Legal Scholars',
  'Public Prosecutors, Government Legal Officers, and Legislative Drafters',
  'Legal Consultants in banks, financial institutions, and regulatory authorities',
  'Human Rights, Development, and Policy Specialists in NGOs and international organisations',
  'Arbitrators, Mediators, and Alternative Dispute Resolution (ADR) Practitioners',
  'Specialists in International Law, Commercial Law, Taxation, Environmental Law, and Intellectual Property Law',
  'Officers in international organisations, diplomatic missions, and regional institutions',
  'Candidates for higher studies, including Ph.D. and postdoctoral research in Bangladesh and abroad',
];

// Closing paragraph, shown after the list.
const CAREER_OUTRO = [
  "The LL.M. programme also strengthens graduates' analytical, research, advocacy, and leadership skills, enabling them to contribute effectively to the development of law, justice, public policy, and good governance in Bangladesh and the global legal community.",
];

const p = new PrismaClient();
const row = await p.program.findUnique({
  where: { slug: SLUG },
  select: { programName: true, careerIntro: true, careerRoles: true },
});
if (!row) { console.error(`No program with slug "${SLUG}"`); process.exit(1); }

const intro = [...CAREER_INTRO, ...CAREER_OUTRO];

console.log(`${row.programName} (${SLUG})\n`);
console.log(`intro paragraphs : ${intro.length}`);
intro.forEach((s, i) => console.log(`  [${i}] ${s.slice(0, 100)}${s.length > 100 ? '…' : ''}`));
console.log(`\nroles            : ${CAREER_ROLES.length}`);
CAREER_ROLES.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s}`));

if (COMMIT) {
  // careerIntro holds the lead-in first and the closing paragraph last;
  // the page renders the role list between the first entry and the rest.
  await p.program.update({
    where: { slug: SLUG },
    data: { careerIntro: intro, careerRoles: CAREER_ROLES },
  });
  console.log('\nwritten.');
} else {
  console.log('\ndry run — pass --commit to apply.');
}
await p.$disconnect();
