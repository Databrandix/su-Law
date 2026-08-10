/**
 * LL.M tuition fee structure, transcribed from the department's
 * postgraduate fee sheet — "POSTGRADUATE (MASTER'S PROGRAMS)
 * (Bi-Semester (Six Months Semester)) Effective From: 24 April, 2026",
 * row 4 (LLM).
 *
 * Source figures, exactly as printed:
 *
 *   SL 4 · LLM · Credit 36 · Duration 1 Year
 *   Regular Per Credit 2000 · % 46 · Per Credit 1080
 *   Semester Fees 12000 · Admission Fee 12500 · Fall-2025 65540
 *   Only for SU Students: Admission Fee 9500, Tuition Fee 1000,
 *                         Sem. Fee 6000 → 55540
 *
 * CORRECTIONS TO THE SHEET, confirmed by the department:
 *   · waiver    46%   → 43%
 *   · perCredit 1080  → 1140   (both rows, including SU students)
 * These two agree with each other and with the printed Fall-2025
 * total:  2000 × (1 − 0.43) = 1140,  and
 *         1140 × 36 + 12,500 + 12,000 = 65,540  ✓
 * Every other figure is the sheet's own.
 *
 * NOTE ON THE ARITHMETIC — deliberately transcribed, not corrected.
 * The other rows on this sheet follow
 *     total = perCredit × credits + admissionFee + semesterFees
 * and match exactly (MAMS 66,980 · MAM 97,700 · MTFM 111,020).
 * The LLM row does not: 1080 × 36 + 12,500 + 12,000 = 63,380, while
 * the sheet prints 65,540 (a 2,160 gap; the formula would need a
 * per-credit of 1,140). The SU-student column is likewise 51,500 by
 * the same formula against a printed 55,540.
 *
 * The department was asked and chose to publish the sheet's figures as
 * printed, so both the per-credit and the total below are the sheet's
 * own. Do not "fix" them here — correct the source sheet and re-run.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/seed-llm-fees.mjs
 *   node --env-file=.env scripts/seed-llm-fees.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const CREDITS = 36;
const ADMISSION_FEE = 12_500;
const SEMESTER_FEES = 12_000;

const FEE = {
  introOverline: 'Master of Laws (LL.M.)',
  introHeading: 'Tuition Fee Structure',
  introBody:
    'Cost per credit and the total program cost vary with your academic background and the shift you choose. Waivers are applied on the standard per-credit rate.',

  overviewStats: [
    { iconName: 'BookOpen',     label: 'Credit',              value: String(CREDITS) },
    { iconName: 'Clock',        label: 'Duration',            value: '1 Year' },
    { iconName: 'CalendarDays', label: 'Bi-Semester',         value: 'Six Months Semester' },
    { iconName: 'Wallet',       label: 'Regular Per Credit',  value: '2000' },
  ],

  shifts: [
    {
      iconName: 'GraduationCap',
      name: 'LLM',
      shiftLabel: 'Postgraduate',
      description: 'Bi-Semester (Six Months Semester) · Effective From: 24 April, 2026',
      groups: [
        {
          background: 'Fall-2025',
          tiers: [
            {
              gpa: '1 Year',
              // Sheet prints 46% / 1080; the department corrected these
              // to 43% / 1140, which is also self-consistent:
              //   2000 × (1 − 0.43)              = 1140
              //   1140 × 36 + 12,500 + 12,000    = 65,540  ✓ matches
              waiver: '43%',
              credits: CREDITS,
              perCredit: 1140,
              semesterFees: SEMESTER_FEES,
              admissionFee: ADMISSION_FEE,
              total: 65_540,
            },
          ],
        },
        {
          background: 'Only for SU Students',
          tiers: [
            {
              gpa: '1 Year',
              waiver: '43%',
              credits: CREDITS,
              perCredit: 1140,
              // The SU-student column on the sheet quotes its own
              // reduced admission and semester fees.
              //
              // NOTE: 1140 × 36 + 9,500 + 6,000 = 56,540, while the
              // sheet prints 55,540 — a 1,000 gap. The printed total is
              // kept as published; do not "fix" it here.
              semesterFees: 6_000,
              admissionFee: 9_500,
              // The sheet prints this qualifier in parentheses beneath
              // the SU-student admission fee.
              admissionFeeNote: 'Tuition Fee-1000',
              total: 55_540,
            },
          ],
        },
      ],
    },
  ],

  // Verbatim from the notes printed on the sheet.
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
      iconName: 'Wallet',
      // Titles render as plain text — no entity escaping here (unlike
      // `text`, which goes through sanitizeHtml).
      title: 'Admission & Semester Fees',
      text: 'Admission Fee 12500. Semester Fees 12000.',
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
    where: { degreeCode: 'LL.M' },
    select: { id: true, programName: true, degreeCode: true },
  });
  if (!program) throw new Error('No program with degreeCode "LL.M" found.');

  const existing = await prisma.programFeeStructure.findUnique({
    where: { programId: program.id },
    select: { id: true },
  });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');
  console.log(`${program.programName} (${program.degreeCode})`);
  console.log(`  ${existing ? 'UPDATE existing fee structure' : 'CREATE new fee structure'}\n`);

  console.log('  Overview:');
  for (const s of FEE.overviewStats) console.log(`    · ${s.label}: ${s.value}`);

  for (const sh of FEE.shifts) {
    console.log(`\n  ${sh.name} — ${sh.description}`);
    for (const g of sh.groups) {
      console.log(`    Group: ${g.background}`);
      for (const t of g.tiers) {
        // Use the tier's own fees — the SU-student row carries reduced
        // ones, so the shared constants would check it against the
        // wrong figures.
        const computed =
          t.perCredit * CREDITS +
          (t.admissionFee ?? ADMISSION_FEE) +
          (t.semesterFees ?? SEMESTER_FEES);
        const note =
          computed === t.total
            ? 'matches the sheet formula'
            : `sheet prints ${t.total.toLocaleString('en-BD')}; ` +
              `formula gives ${computed.toLocaleString('en-BD')} — printed value kept`;
        console.log(
          `      ${t.gpa.padEnd(38)} ${String(t.waiver).padEnd(5)} ` +
            `${t.perCredit.toLocaleString('en-BD').padStart(6)} ` +
            `${t.total.toLocaleString('en-BD').padStart(9)}`,
        );
        console.log(`        ↳ ${note}`);
      }
    }
  }

  console.log('\n  Policies:');
  for (const p of FEE.policies) console.log(`    · ${p.title}`);

  if (COMMIT) {
    await prisma.programFeeStructure.upsert({
      where: { programId: program.id },
      create: { programId: program.id, ...FEE, displayOrder: 1 },
      update: FEE,
    });
    console.log('\nSaved.');
  }
} finally {
  await prisma.$disconnect();
}
