/**
 * Take a nav-managed page offline, or bring it back.
 *
 * Flips `isDisabled` on the MainNavItem whose href matches. That single
 * flag now drives four surfaces at once:
 *
 *   - the navbar dropdown entry (greyed, href="#", not clickable)
 *   - the mobile drawer entry
 *   - the page itself (calls notFound() while disabled)
 *   - search results + sitemap (the URL is dropped from both)
 *
 * The same toggle exists in the admin UI — /admin/nav, edit the item,
 * tick "Disabled" — so this script is only a convenience.
 *
 *   node --env-file=.env scripts/toggle-nav-page.mjs /student-society/syllabus off
 *   node --env-file=.env scripts/toggle-nav-page.mjs /student-society/syllabus on
 *   node --env-file=.env scripts/toggle-nav-page.mjs            # list current state
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const [href, state] = process.argv.slice(2);

try {
  if (!href) {
    const all = await prisma.mainNavItem.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { group: { select: { name: true } } },
    });
    console.log('\nCurrent nav items:\n');
    for (const i of all) {
      console.log(
        `  ${i.isDisabled ? 'OFF' : 'on '}  ${(i.group.name + ' / ' + i.name).padEnd(44)} ${i.href}`,
      );
    }
    console.log('\nPass an href plus on|off to change one.\n');
  } else {
    if (state !== 'on' && state !== 'off') {
      throw new Error('Second argument must be "on" or "off".');
    }
    const item = await prisma.mainNavItem.findFirst({ where: { href } });
    if (!item) throw new Error(`No nav item with href "${href}".`);

    const isDisabled = state === 'off';
    await prisma.mainNavItem.update({ where: { id: item.id }, data: { isDisabled } });
    console.log(
      `"${item.name}" (${href}) is now ${isDisabled ? 'DISABLED — link greyed out, page 404s' : 'ENABLED — link live, page renders'}.`,
    );
  }
} finally {
  await prisma.$disconnect();
}
