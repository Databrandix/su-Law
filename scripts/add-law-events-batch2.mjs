/**
 * Adds four more Department of Law events, supplied verbatim by the
 * department: Court Visit, Farewell Programme, Fresher's Reception,
 * and Workshops.
 *
 * ADDITIVE — the three existing events (Career Guidelines, Tax Law,
 * Public Speaking) are left untouched, and these are appended after
 * them in displayOrder.
 *
 * DELIBERATELY LEFT BLANK, because the department has not supplied them:
 *   · eventDate / displayDate — null. Both the listing and the detail
 *     page return null from their date formatter and hide the date
 *     pill, so an undated event renders cleanly.
 *   · time / venue           — null for the same reason.
 *   · imageUrl               — required by the schema, so each row gets
 *     a neutral placeholder to be replaced from /admin/events once the
 *     real photos are uploaded.
 *   · details / CTA          — empty, nothing to put there yet.
 *
 * `status` is set to 'Current' rather than 'Past': with no date on the
 * record, claiming an event already happened would be asserting a fact
 * the department did not give us. Change it per-event from /admin/events.
 *
 * Re-running is safe — rows are matched on slug and updated in place.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const PLACEHOLDER = '/assets/events-hero.webp';

const EVENTS = [
  {
    slug: 'court-visit',
    title: 'Court Visit',
    shortTitle: 'Court Visit',
    category: 'Industrial Visit',
    summary:
      'A visit to the court giving students first-hand exposure to judicial proceedings and courtroom practice.',
    description: [
      'Students of the Department of Law visit the court to observe judicial proceedings in person, following how a case moves through the courtroom and how the bench, the bar and court officials each play their part.',
      'The visit connects classroom study to live practice — students see advocacy, examination and courtroom etiquette as they actually happen, which is difficult to convey through textbooks alone.',
    ],
    focus: 'Giving law students practical exposure to courtroom proceedings and the administration of justice.',
  },
  {
    slug: 'farewell-program',
    title: 'Farewell Programme',
    shortTitle: 'Farewell Programme',
    category: 'Cultural',
    summary:
      'A farewell for graduating students of the Department of Law, marking the close of their time at the university.',
    description: [
      'The Department of Law hosts a farewell programme for its graduating batch, bringing students, faculty and staff together to mark the end of their academic journey at Sonargaon University.',
      'The programme combines reflections from teachers and outgoing students with cultural performances, and serves as a send-off for graduates entering the legal profession.',
    ],
    focus: 'Celebrating the graduating batch and marking their transition from student to legal professional.',
  },
  {
    slug: 'freshers-reception',
    title: "Fresher's Reception",
    shortTitle: "Fresher's Reception",
    category: 'Cultural',
    summary:
      'A welcome programme introducing newly admitted students to the Department of Law, its faculty and its culture.',
    description: [
      'The Department of Law welcomes each newly admitted batch with a reception programme, introducing students to the faculty members, the departmental culture and what the coming years of legal study will involve.',
      'Alongside the formal welcome, the programme gives new students an early opportunity to meet their seniors and classmates and to learn about the societies and co-curricular activities open to them.',
    ],
    focus: 'Welcoming newly admitted students and introducing them to the department and its community.',
  },
  {
    slug: 'workshops',
    title: 'Workshops',
    shortTitle: 'Workshops',
    category: 'Workshop',
    summary:
      'Skill-building workshops for law students covering legal research, writing, advocacy and professional practice.',
    description: [
      'The Department of Law runs workshops for its students on the practical skills the legal profession demands — among them legal research, legal writing, drafting and advocacy.',
      'The sessions are hands-on rather than lecture-based, giving students supervised practice and direct feedback on work they produce themselves.',
    ],
    focus: 'Building the practical legal skills students need alongside their academic coursework.',
  },
];

const p = new PrismaClient();

const existing = await p.event.findMany({ select: { slug: true, displayOrder: true } });
const existingSlugs = new Set(existing.map((e) => e.slug));
const maxOrder = existing.length ? Math.max(...existing.map((e) => e.displayOrder)) : -1;

console.log(`existing events kept : ${existing.length}`);
console.log(`events to add/update : ${EVENTS.length}`);
console.log(`appending from order : ${maxOrder + 1}\n`);

for (const [i, e] of EVENTS.entries()) {
  console.log('='.repeat(66));
  console.log(`${e.title}   ${existingSlugs.has(e.slug) ? '[exists — update]' : '[new]'}`);
  console.log('='.repeat(66));
  console.log(`  slug        ${e.slug}`);
  console.log(`  category    ${e.category}`);
  console.log(`  status      Current  (no date supplied — see header)`);
  console.log(`  date        (none)`);
  console.log(`  paragraphs  ${e.description.length}`);
  console.log(`  image       PLACEHOLDER — upload from /admin/events`);
  console.log(`  focus       ${e.focus}`);
}

if (COMMIT) {
  for (const [i, e] of EVENTS.entries()) {
    const data = {
      title: e.title,
      shortTitle: e.shortTitle,
      category: e.category,
      status: 'Current',
      eventDate: null,
      displayDate: null,
      time: null,
      venue: null,
      imageUrl: PLACEHOLDER,
      imagePublicId: null,
      summary: e.summary,
      description: e.description,
      focus: e.focus,
      details: [],
      ctaLabel: null,
      ctaHref: null,
      ctaExternal: false,
    };
    await p.event.upsert({
      where: { slug: e.slug },
      create: { slug: e.slug, ...data, displayOrder: maxOrder + 1 + i },
      // Preserve displayOrder and any image already uploaded on re-run.
      update: { ...data, imageUrl: undefined, imagePublicId: undefined },
    });
  }
  console.log(`\nwritten — ${await p.event.count()} events total.`);
} else {
  console.log('\ndry run — pass --commit to apply.');
}
await p.$disconnect();
