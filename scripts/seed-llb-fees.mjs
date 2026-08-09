/**
 * LL.B tuition fee structure, transcribed from the department's
 * "Fall-2026 · Effective From: 24 April, 2026" fee sheet (row 6, LLB).
 *
 * Source figures, exactly as printed:
 *
 *   Credits 144 · Admission Fee 12,500 · Semester Fee 96,000
 *   SUN (Morning):
 *     SSC+HSC        SSC+Dip       Waiver  Credit Fee  Total Cost
 *     —              —             —         6,666     1,068,404
 *     5.00-9.99      5.00-8.99     54%       3,066       550,004
 *     10             9             59%       2,733       502,052
 *   STAR (Friday): not offered for LLB ("----" in the source).
 *
 * Arithmetic check (all three rows agree with the sheet):
 *   total = creditFee × 144 + 12,500 + 96,000
 *
 * LL.B has TWO waiver tiers, not the three most other programmes use —
 * confirmed with the department.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/seed-llb-fees.mjs
 *   node --env-file=.env scripts/seed-llb-fees.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const CREDITS = 144;
const ADMISSION_FEE = 12_500;
const SEMESTER_FEE = 96_000;

// The sheet prints "SSC + HSC" and "SSC + Dip" as two separate columns
// with their own GPA bands against shared waiver/fee figures, so each
// becomes its own group — matching how the template renders every other
// programme's fee table.
//
// The un-waived rate is the sheet's first row, which carries no GPA
// band of its own; it is listed under both routes as the 0% baseline.
const BASE_TIER = {
  gpa: 'Below 5.00',
  waiver: '0%',
  credits: CREDITS,
  perCredit: 6666,
  total: 1_068_404,
};

const SSC_HSC_TIERS = [
  BASE_TIER,
  { gpa: '5.00–9.99', waiver: '54%', credits: CREDITS, perCredit: 3066, total: 550_004 },
  { gpa: '10.00',     waiver: '59%', credits: CREDITS, perCredit: 2733, total: 502_052 },
];

const DIPLOMA_TIERS = [
  BASE_TIER,
  { gpa: '5.00–8.99', waiver: '54%', credits: CREDITS, perCredit: 3066, total: 550_004 },
  { gpa: '9.00',      waiver: '59%', credits: CREDITS, perCredit: 2733, total: 502_052 },
];

const FEE = {
  introOverline: 'Bachelor of Laws (LL.B.)',
  introHeading: 'Tuition Fee Structure',
  introBody:
    'Cost per credit and the total program cost vary with your academic background and the shift you choose. Waivers are applied on the standard per-credit rate.',

  // Labels taken from the sheet's own column headers and header rows.
  overviewStats: [
    { iconName: 'BookOpen',     label: 'Credit',        value: String(CREDITS) },
    { iconName: 'CalendarDays', label: 'Bi-Semester',   value: 'Six Months Semester' },
    { iconName: 'Wallet',       label: 'Admission Fee', value: '12500' },
    { iconName: 'Receipt',      label: 'Semester Fee',  value: '96000' },
  ],

  // One shift only: the source marks STAR (Friday) as "----" for LLB.
  shifts: [
    {
      iconName: 'Sunrise',
      name: 'SUN',
      shiftLabel: 'Morning',
      description: 'Fall-2026 · Effective From: 24 April, 2026',
      groups: [
        { background: 'SSC + HSC', tiers: SSC_HSC_TIERS },
        { background: 'Diploma',   tiers: DIPLOMA_TIERS },
      ],
    },
  ],

  // Transcribed verbatim from the four notes printed on the fee sheet.
  // Wording, punctuation and capitalisation are the department's — do
  // not rephrase: this is fee policy, and a paraphrase can change what
  // an applicant is entitled to.
  policies: [
    {
      iconName: 'Award',
      title: 'Note',
      text: '(SSC and HSC/Diploma if Golden A+, without LLB and Postrgraduate) 100% Tuition Fee Waiver',
    },
    {
      iconName: 'Percent',
      title: 'Waiver Policy',
      text: '10% waiver on tuition fees for full 1st semester payment at admission; 15% waiver on tuition fees for full program fee payment at admission.',
    },
    {
      iconName: 'CalendarClock',
      title: 'For Fall 2026',
      text: '‘One Month Tuition and Semester fees must be Paid Along with Admission Fee. (Note: Tuition fees &amp; Semester fees Shall Have to be Paid in Advance Every Month. Otherwise Penalty will be Applied)',
    },
    {
      iconName: 'FileText',
      title: 'Others Fee',
      text: 'An additional BDT 7,500 will be charged for the Provisional Certificate (PVC) fee in last semester.',
    },
  ],
};

try {
  const program = await prisma.program.findFirst({
    where: { degreeCode: 'LL.B' },
    select: { id: true, programName: true, degreeCode: true },
  });
  if (!program) throw new Error('No program with degreeCode "LL.B" found.');

  const existing = await prisma.programFeeStructure.findUnique({
    where: { programId: program.id },
    select: { id: true },
  });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');
  console.log(`${program.programName} (${program.degreeCode})`);
  console.log(`  ${existing ? 'UPDATE existing fee structure' : 'CREATE new fee structure'}\n`);

  console.log(`  ${FEE.introHeading}`);
  console.log(`  ${FEE.introBody}\n`);

  console.log('  Overview:');
  for (const s of FEE.overviewStats) console.log(`    · ${s.label}: ${s.value}`);

  for (const sh of FEE.shifts) {
    console.log(`\n  Shift: ${sh.name} (${sh.shiftLabel})`);
    for (const g of sh.groups) {
      console.log(`    Group: ${g.background}`);
      console.log(`      ${'Background'.padEnd(36)} ${'Waiver'.padEnd(7)} ${'Credit'.padStart(7)} ${'Total'.padStart(11)}`);
      for (const t of g.tiers) {
        const check = t.perCredit * CREDITS + ADMISSION_FEE + SEMESTER_FEE;
        const ok = check === t.total ? 'ok' : `MISMATCH (computed ${check})`;
        console.log(
          `      ${t.gpa.padEnd(36)} ${String(t.waiver).padEnd(7)} ` +
            `${t.perCredit.toLocaleString('en-BD').padStart(7)} ` +
            `${t.total.toLocaleString('en-BD').padStart(11)}   ${ok}`,
        );
      }
    }
  }

  console.log('\n  Policies:');
  for (const p of FEE.policies) console.log(`    · ${p.title}`);

  if (COMMIT) {
    await prisma.programFeeStructure.upsert({
      where: { programId: program.id },
      create: { programId: program.id, ...FEE, displayOrder: 0 },
      update: FEE,
    });
    console.log('\nSaved.');
  }
} finally {
  await prisma.$disconnect();
}
