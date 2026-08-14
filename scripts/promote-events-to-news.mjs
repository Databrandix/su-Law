/**
 * Publish the two past seminars that are missing from the News hub.
 *
 * Which events qualify, and why the other five do not:
 *
 *   career-guidelines  → ADD. Dated (28 Aug 2025), status Past, summary
 *   tax-law            → ADD. Dated (22 Nov 2025), status Past, summary
 *                        already written in the past tense — the same
 *                        shape the three existing news articles have.
 *
 *   public-speaking    → skip, already published as
 *                        news/public-speaking-competition
 *   court-visit        → skip, already published as news/court-visit
 *                        ("Exploring Legal Arena in Practical Sense")
 *   farewell-program   → skip. status Current with no eventDate: these
 *   freshers-reception    describe recurring programmes the department
 *   workshops             runs, not something that happened on a date.
 *                        News rows sort on a required publishedAt, so
 *                        an undated standing offer has nothing honest
 *                        to sort by and reads wrong as an article.
 *
 * Field mapping, Event → News:
 *   eventDate   → publishedAt   (required; drives list ordering)
 *   imageUrl    → coverUrl      (+ imagePublicId → coverPublicId)
 *   description → body          (Json string[], same paragraph shape)
 *   venue/time  → meta rows     ([{label,value}], rendered as the
 *                                detail page's info table)
 * `focus` has no News counterpart and is intentionally dropped — the
 * summary already carries the same point.
 *
 * The Event rows are left untouched: these stay on /student-society/events
 * and additionally appear under News, matching how court-visit and
 * public-speaking already exist in both places.
 *
 * Re-running is safe — an existing news row with the same slug is
 * updated in place rather than duplicated.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/promote-events-to-news.mjs
 *   node --env-file=.env scripts/promote-events-to-news.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

// Event slug → the slug its news article takes. Kept distinct from the
// event slug where a bare word would read oddly as a news URL.
const PROMOTE = [
  { eventSlug: 'career-guidelines', newsSlug: 'career-prospect-of-law-graduates' },
  { eventSlug: 'tax-law',           newsSlug: 'tax-law-as-a-profession' },
];

function metaFrom(event) {
  const rows = [];
  if (event.venue) rows.push({ label: 'Venue', value: event.venue });
  if (event.time) rows.push({ label: 'Time', value: event.time });
  rows.push({ label: 'Organised by', value: 'Department of Law, Sonargaon University' });
  return rows;
}

try {
  console.log(COMMIT ? '\n=== COMMIT ===\n' : '\n=== DRY RUN (pass --commit to write) ===\n');

  const plan = [];

  for (const { eventSlug, newsSlug } of PROMOTE) {
    const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
    if (!event) {
      console.log(`!! event "${eventSlug}" not found — skipped`);
      continue;
    }
    if (!event.eventDate) {
      console.log(`!! event "${eventSlug}" has no date — skipped (publishedAt is required)`);
      continue;
    }

    const existing = await prisma.news.findUnique({ where: { slug: newsSlug } });

    const data = {
      slug:          newsSlug,
      title:         event.title,
      shortTitle:    event.shortTitle,
      // Every promoted event is a Seminar, which is a valid News
      // category; guard anyway so an odd one falls back rather than
      // failing the Zod enum on a later admin edit.
      category:      ['Academic', 'Achievement', 'Event', 'Workshop', 'Seminar', 'Industrial Visit']
                       .includes(event.category) ? event.category : 'Event',
      publishedAt:   event.eventDate,
      displayDate:   event.displayDate ?? null,
      summary:       event.summary,
      coverUrl:      event.imageUrl,
      coverPublicId: event.imagePublicId ?? null,
      body:          Array.isArray(event.description) ? event.description : [],
      meta:          metaFrom(event),
    };

    plan.push({ data, existingId: existing?.id ?? null, eventSlug });
  }

  for (const p of plan) {
    console.log(`${p.existingId ? '[update]' : '[new]   '} ${p.data.slug}   ← event/${p.eventSlug}`);
    console.log(`   title      : ${p.data.title}`);
    console.log(`   category   : ${p.data.category}`);
    console.log(`   publishedAt: ${p.data.publishedAt.toISOString().slice(0, 10)}`);
    console.log(`   bodyParas  : ${p.data.body.length}`);
    console.log(`   meta       : ${p.data.meta.map((m) => `${m.label}=${m.value}`).join(' | ')}`);
    console.log(`   cover      : ${p.data.coverUrl ? 'yes' : 'MISSING'}`);
    console.log();
  }

  if (!plan.length) console.log('Nothing to do.\n');

  if (COMMIT) {
    for (const p of plan) {
      if (p.existingId) {
        await prisma.news.update({ where: { id: p.existingId }, data: p.data });
      } else {
        await prisma.news.create({ data: p.data });
      }
    }
    console.log(`Wrote ${plan.length} news article(s).`);
  }
} finally {
  await prisma.$disconnect();
}
