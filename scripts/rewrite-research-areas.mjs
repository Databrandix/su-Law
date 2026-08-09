/**
 * Replace the inherited Business-Administration research clusters with
 * the Department of Law's own.
 *
 * Every area below is grounded in something already in this database —
 * a faculty member's declared specialisation, their published work, or
 * a programme specialisation — so the section reflects what the
 * department actually researches rather than a generic list of legal
 * subjects. The provenance is recorded per area in `evidence` and
 * printed by the dry run so it can be checked before writing.
 *
 * The featured card keeps the same shape as the BA row it replaces
 * (heading + description + CTA). Its image is deliberately left null:
 * the inherited one lives in the OLD department's Cloudinary account
 * and would keep this site dependent on it. Upload a replacement at
 * /admin/research-areas.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/rewrite-research-areas.mjs
 *   node --env-file=.env scripts/rewrite-research-areas.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const AREAS = [
  {
    areaName: 'Constitutional Law & Governance',
    iconName: 'Landmark',
    evidence:
      'Tariq Iqbal + Muhammad Ali + Sunzida Akter specialisation; Chowdhury (2024) on constitutional borrowing; LL.M. specialisation',
    isFeatured: true,
    featuredHeading: 'Constitutional Law & Governance',
    featuredDescription:
      'The department’s largest research cluster — comparative constitutional dynamics, constitutional borrowing and transplantation in Bangladesh, separation of powers, and access to justice. Published in the Journal of Law and Human Rights and the Sonargaon University Journal.',
    featuredCtaHref: '/research',
  },
  {
    areaName: 'Human Rights & Refugee Law',
    iconName: 'Users',
    evidence:
      'Sagor Hossain specialisation (International Refugee Laws); Runa (2025) armed conflict / humanitarian law; Runa human trafficking (2023); LL.M. specialisation',
  },
  {
    areaName: 'Criminal Justice & Victimology',
    iconName: 'Scale',
    evidence:
      'Runa specialisation (Victimology and Restorative Justice); Runa rape law reform, cyberbullying, child labour; Sunzida Akter interest (Criminal law)',
  },
  {
    areaName: 'Corporate & Commercial Law',
    iconName: 'Briefcase',
    evidence:
      'Tariq Iqbal specialisation (Business Law, Corporate Law); SCoLA Corporate Law fellowship; Chowdhury (2025) e-commerce consumer protection; LL.B. + LL.M. specialisation',
  },
  {
    areaName: 'International & Environmental Law',
    iconName: 'Globe',
    evidence:
      'Sagor Hossain specialisation (International Environmental Law, International Institution); Hossain (2025) environmental equity; Chowdhury/Ali/Akhter (2025) river rights',
  },
  {
    areaName: 'Family Law & Personal Status',
    iconName: 'Home',
    evidence:
      'Muhammad Ali specialisation (Comparative Family Law); Chowdhury (2025) Hindu Marriage Registration Act; Runa on family court procedure and parental alimony',
  },
  {
    areaName: 'Technology, Cyber & Intellectual Property Law',
    iconName: 'ShieldCheck',
    evidence:
      'Hossain (2025) digital sovereignty in the AI era; Chowdhury (2025) IP law comparative study + digital legacy; Runa on the Digital Security Act 2018 and cyberbullying',
  },
];

try {
  const before = await prisma.researchArea.findMany({ orderBy: { displayOrder: 'asc' } });

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  console.log(`REMOVE (${before.length} Business Administration areas):`);
  for (const a of before) {
    console.log(`  · ${a.areaName}${a.isFeatured ? '   [featured]' : ''}`);
  }

  console.log(`\nADD (${AREAS.length} Law areas):\n`);
  for (const [i, a] of AREAS.entries()) {
    console.log(`  ${i + 1}. ${a.areaName}   (icon: ${a.iconName})${a.isFeatured ? '   [FEATURED]' : ''}`);
    console.log(`     evidence: ${a.evidence}`);
    if (a.isFeatured) console.log(`     card    : ${a.featuredDescription}`);
    console.log();
  }

  // The old featured image belongs to the previous department's
  // Cloudinary account — flag it rather than silently carrying it over.
  const oldImage = before.find((a) => a.featuredImageUrl)?.featuredImageUrl;
  if (oldImage) {
    console.log(`NOTE: dropping featured image hosted on the old BA account:\n      ${oldImage}`);
    console.log('      Upload a Law image at /admin/research-areas.\n');
  }

  if (COMMIT) {
    await prisma.$transaction([
      prisma.researchArea.deleteMany({}),
      ...AREAS.map((a, i) =>
        prisma.researchArea.create({
          data: {
            areaName: a.areaName,
            iconName: a.iconName,
            displayOrder: i + 1,
            isFeatured: a.isFeatured ?? false,
            featuredHeading: a.featuredHeading ?? null,
            featuredDescription: a.featuredDescription ?? null,
            featuredCtaHref: a.featuredCtaHref ?? null,
          },
        }),
      ),
    ]);
    const after = await prisma.researchArea.count();
    console.log(`Replaced. ResearchArea rows now: ${after}`);
  }
} finally {
  await prisma.$disconnect();
}
