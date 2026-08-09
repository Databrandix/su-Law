/**
 * Reduce each ResearchPaper.title to the paper's own title.
 *
 * The source spreadsheet stores a full citation in the title column —
 * authors, year, journal, volume, ISSN, page range — so /research shows
 * a paragraph where a title belongs, and repeats data already rendered
 * from `authors`, `publicationYear` and `publisher` right below it.
 *
 * The titles below are transcribed by hand rather than cut with a
 * regex. The citations are inconsistent enough that no rule is safe:
 * some titles contain their own colon ("From Morality to Legal Right:
 * A Comprehensive Analysis…"), some carry no journal at all, and the
 * punctuation around the journal name varies per row. Each entry is
 * matched on a distinctive fragment of the stored citation, so a row
 * that has since changed simply fails to match and is reported rather
 * than being rewritten with the wrong title.
 *
 * Nothing is discarded that the page needs: author, year, publisher and
 * link all live in their own columns already. Volume/issue/ISSN are
 * dropped — they are not shown on the page.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/shorten-paper-titles.mjs
 *   node --env-file=.env scripts/shorten-paper-titles.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

// match: a fragment unique to the stored citation
// title: the paper's title, exactly as the source spells it
//        (typos in the source are preserved — see NOTE entries)
const TITLES = [
  {
    match: 'Paradox of Flexibility',
    title:
      'The Paradox of Flexibility: A Socio-Legal Appraisal of Gig Workers’ Rights and Protections in Bangladesh',
  },

  // ── Sharmin Jahan Runa ────────────────────────────────────────────
  {
    match: 'Challenges of Freedom of Expression',
    title: 'The Challenges of Freedom of Expression and the Digital Security Act, 2018',
  },
  {
    match: 'Dress Code of Judges',
    title:
      'The Dress Code of Judges and Advocates: An Analytical Study in Bangladesh Perspective',
  },
  {
    match: 'Revisiting Existing Rape Law',
    title: 'Revisiting Existing Rape Law in Bangladesh under Analytical Approach',
  },
  {
    match: 'From Morality to Legal Right',
    // The colon here belongs to the title itself.
    title: "From Morality to Legal Right: A Comprehensive Analysis on Parent's Alimony",
  },
  {
    match: 'National Treatment for Combating Human Trafficking: A Comprehensive Study in Bangladesh".Journal',
    title:
      'National Treatment for Combating Human Trafficking: A Comprehensive Study in Bangladesh',
  },
  {
    match: 'Paradox of Recognition of Third Gender',
    title: 'The Paradox of Recognition of Third Gender in Bangladesh: A Critical Review',
  },
  {
    match: 'Razzaque, N., Runa, S. J. & Hossain M. S. (2023)',
    title: 'Road Accident and Safety Issue in Bangladesh: A Critical Review',
    // Appears on both Runa's and Sagor Hossain's lists — same paper,
    // two co-authors, so both rows are rewritten.
    all: true,
  },
  {
    match: 'Runa, S. J. (2023). National treatment',
    title:
      'National Treatment for Combating Human Trafficking: A Comprehensive Study in Bangladesh',
  },
  {
    match: 'Implementation of human rights and humanitarian law',
    title:
      'Implementation of Human Rights and Humanitarian Law in Situations of Armed Conflict: An Analytical Approach',
  },
  {
    match: 'Jurisdictional and Procedural Issues',
    title: 'Jurisdictional and Procedural Issues of the Family Courts in Bangladesh',
  },
  {
    match: 'Comprehensive look on Rape law reform',
    title: 'A Comprehensive Look on Rape Law Reform: A Demand of Society towards Justice',
  },
  {
    match: 'Cyberbulling',
    // NOTE: "Cyberbulling" is the source's spelling; left as supplied.
    title: 'Cyberbulling: Legal Scenario and Strategies for Prevention',
  },
  {
    match: 'child labour in Bangladesh',
    // NOTE: "framworks" is the source's spelling; left as supplied.
    title:
      'Exploring the Causes, Consequences & Legal Framworks of Child Labour in Bangladesh',
  },

  // ── Md. Sagor Hossain ─────────────────────────────────────────────
  {
    match: 'Digital Sovereignty in the Artificial',
    title:
      'Digital Sovereignty in the Artificial Intelligence Era: Exploring Legal and Jurisprudential Norms in Globalized International Law',
  },
  {
    match: 'International Refugee Law and Bangladesh',
    title:
      'International Refugee Law and Bangladesh: Navigating Sovereignty and Humanitarian Obligations',
  },
  {
    match: 'International Environmental Law and Bangladesh',
    title:
      'International Environmental Law and Bangladesh: Ramifications of Environmental Equity and Sustainable Development',
  },
  { match: 'Digital Evidence (2025)', title: 'Digital Evidence' },
  { match: 'The Succession Laws (2025)', title: 'The Succession Laws' },
  {
    match: 'Archaeological and Antiquities Laws',
    title: 'The Archaeological and Antiquities Laws',
  },

  // ── Muhammad Ali ──────────────────────────────────────────────────
  {
    match: 'Legal Status of River Rights',
    title:
      'The Legal Status of River Rights in Bangladesh: A Comparative Analysis of River Personhood and Rights-Based Approach',
    // Co-authored by Chowdhury, Ali and Akhter — three rows.
    all: true,
  },
  {
    match: 'key problems facing civil justice',
    title:
      'The Key Problems Facing Civil Justice Today are Cost, Delay & Complexity: A Critical Review',
  },

  // ── Joydeep Chowdhury ─────────────────────────────────────────────
  {
    match: 'Hindu Marriage Registration Act',
    title:
      'The Hindu Marriage Registration Act, 2012: Legal Recognition, Challenges, and the Path toward Gender Equality in Bangladesh',
  },
  {
    match: 'Strengthening e-commerce consumer protection',
    title:
      'Strengthening E-Commerce Consumer Protection in Bangladesh: Legal Challenges, Regulatory Gaps, and Reform Strategies',
  },
  {
    match: 'Comparative constitutional dynamics',
    title:
      'Comparative Constitutional Dynamics: Borrowing and Transplantation in the Constitution of Bangladesh',
  },
  {
    match: 'Digital legacy',
    title:
      'Digital Legacy: Redefining Estate Law in the Age of Social Media and Virtual Assets',
  },
  {
    match: 'intellectual property laws of Bangladesh and India',
    title:
      'Comparative Analysis of Intellectual Property Laws of Bangladesh and India in the Age of Global Techno-Capitalism',
  },
  {
    match: 'Navigating access to justice',
    title: 'Navigating Access to Justice in Bangladesh: A Critical Overview',
  },
];

try {
  const rows = await prisma.researchPaper.findMany({
    orderBy: { displayOrder: 'asc' },
    select: { id: true, title: true, authors: true, displayOrder: true },
  });

  const plan = [];
  const usedIds = new Set();

  for (const entry of TITLES) {
    const hits = rows.filter((r) => r.title.includes(entry.match) && !usedIds.has(r.id));
    if (hits.length === 0) {
      console.log(`!! no row matches "${entry.match}" — skipped`);
      continue;
    }
    if (hits.length > 1 && !entry.all) {
      console.log(`!! "${entry.match}" matches ${hits.length} rows but is not marked all — skipped`);
      continue;
    }
    for (const h of hits) {
      usedIds.add(h.id);
      plan.push({ id: h.id, order: h.displayOrder, authors: h.authors, before: h.title, after: entry.title });
    }
  }

  const untouched = rows.filter((r) => !usedIds.has(r.id));

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  for (const p of plan.sort((a, b) => a.order - b.order)) {
    console.log(`[${String(p.order).padStart(2)}] ${p.authors}`);
    console.log(`  before: ${p.before}`);
    console.log(`  after : ${p.after}\n`);
  }

  console.log(`${plan.length} of ${rows.length} rows rewritten.`);
  if (untouched.length) {
    console.log('\nNOT MATCHED — left unchanged:');
    for (const u of untouched) console.log(`  [${u.displayOrder}] ${u.title.slice(0, 90)}`);
  }

  if (COMMIT) {
    for (const p of plan) {
      await prisma.researchPaper.update({ where: { id: p.id }, data: { title: p.after } });
    }
    console.log(`\nUpdated ${plan.length} titles.`);
  }
} finally {
  await prisma.$disconnect();
}
