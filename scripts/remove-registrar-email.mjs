/**
 * Drop registrar@su.edu.bd from the public Contact page.
 *
 * The address renders in two independent places, so removing only one
 * leaves it visible:
 *
 *   1. contact_page_content.quickContactCards — the "E-mail" card's
 *      SECONDARY line. Only the secondary pair is cleared; the card's
 *      primary address (admission.info@su.edu.bd) stays.
 *   2. campus_location.email — one campus row carries it as its
 *      contact address. Set to null so the row renders without an
 *      e-mail line rather than being deleted.
 *
 * Nothing else is touched: the string also appears as placeholder text
 * in the admin editor, which is not data.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/remove-registrar-email.mjs
 *   node --env-file=.env scripts/remove-registrar-email.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const EMAIL = 'registrar@su.edu.bd';
const prisma = new PrismaClient();

const isCard = (v) => v && typeof v === 'object' && !Array.isArray(v);

try {
  console.log(COMMIT ? '\n=== COMMIT ===\n' : '\n=== DRY RUN (pass --commit to write) ===\n');

  // ── 1. Quick-contact cards ───────────────────────────────────────
  const contact = await prisma.contactPageContent.findUnique({
    where: { id: 'singleton' },
  });

  let nextCards = null;
  if (contact && Array.isArray(contact.quickContactCards)) {
    let touched = false;
    nextCards = contact.quickContactCards.map((c) => {
      if (!isCard(c)) return c;
      const hitsSecondary =
        typeof c.secondaryValue === 'string' && c.secondaryValue.includes(EMAIL);
      const hitsHref =
        typeof c.secondaryHref === 'string' && c.secondaryHref.includes(EMAIL);
      if (!hitsSecondary && !hitsHref) return c;
      touched = true;
      console.log(`quickContactCards["${c.title}"]:`);
      console.log(`   secondaryValue: ${c.secondaryValue ?? 'null'}  ->  null`);
      console.log(`   secondaryHref : ${c.secondaryHref ?? 'null'}  ->  null`);
      console.log(`   (primary kept: ${c.primaryValue ?? 'null'})`);
      return { ...c, secondaryValue: null, secondaryHref: null };
    });
    if (!touched) {
      console.log('quickContactCards: no match — nothing to change');
      nextCards = null;
    }
  }

  // ── 2. Campus locations ──────────────────────────────────────────
  const campuses = await prisma.campusLocation.findMany();
  const campusHits = campuses.filter((c) => c.email && c.email.includes(EMAIL));
  for (const c of campusHits) {
    console.log(`\ncampusLocation "${c.name ?? c.id}":`);
    console.log(`   email: ${c.email}  ->  null`);
  }
  if (!campusHits.length) console.log('\ncampusLocation: no match');

  console.log();

  if (COMMIT) {
    if (nextCards) {
      await prisma.contactPageContent.update({
        where: { id: 'singleton' },
        data: { quickContactCards: nextCards },
      });
    }
    for (const c of campusHits) {
      await prisma.campusLocation.update({ where: { id: c.id }, data: { email: null } });
    }
    console.log(
      `Updated ${nextCards ? 1 : 0} contact card set + ${campusHits.length} campus row(s).`,
    );
  }
} finally {
  await prisma.$disconnect();
}
