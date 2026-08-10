/**
 * Put the department's two societies directly in the Student Society
 * dropdown, as siblings of "Club list" — not nested under it:
 *
 *     Student Society ▸ Notice Board
 *                     ▸ …
 *                     ▸ Club list
 *                     ▸ Sonargaon University Moot Court Society (SUMCS)
 *                     ▸ Sonargaon University Law Club (SULC)
 *
 * Each links to its card's anchor on the club-list page
 * (/student-society/club-list#law-club); the cards carry matching `id`
 * attributes.
 *
 * Only the Law societies are listed, not all 15 clubs — the rest are
 * university-wide and already one click away via "Club list".
 *
 * Names come from the Club table rather than being hard-coded, so a
 * rename in /admin/clubs stays in sync after a re-run. Re-running is
 * safe: an existing item with the same href is updated in place, and any
 * copy previously nested under "Club list" is lifted out.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/add-club-nav-children.mjs
 *   node --env-file=.env scripts/add-club-nav-children.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

// The department's own societies, by Club.slug.
const SLUGS = ['moot-court-society', 'law-club'];

try {
  const group = await prisma.mainNavGroup.findFirst({
    where: { name: 'Student Society' },
    include: {
      items: {
        orderBy: { displayOrder: 'asc' },
        select: { id: true, name: true, href: true, parentId: true, displayOrder: true },
      },
    },
  });
  if (!group) throw new Error('No "Student Society" nav group found.');

  const clubs = await prisma.club.findMany({
    where: { slug: { in: SLUGS } },
    select: { slug: true, name: true, abbreviation: true },
  });

  const topLevel = group.items.filter((i) => i.parentId === null);
  const lastOrder = Math.max(0, ...topLevel.map((i) => i.displayOrder));

  const plan = [];
  for (const [i, slug] of SLUGS.entries()) {
    const club = clubs.find((c) => c.slug === slug);
    if (!club) {
      console.log(`!! no club with slug "${slug}" — skipped`);
      continue;
    }
    const href = `/student-society/club-list#${club.slug}`;
    const existing = group.items.find((x) => x.href === href);
    plan.push({
      existingId: existing?.id ?? null,
      // Was it wrongly nested under "Club list"? Then it needs lifting.
      wasNested: existing?.parentId != null,
      name: `${club.name} (${club.abbreviation})`,
      href,
      displayOrder: lastOrder + i + 1,
    });
  }

  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');
  console.log('Student Society dropdown after this change:\n');

  for (const item of topLevel) {
    console.log(`  ${item.name}  →  ${item.href}`);
  }
  for (const c of plan) {
    const tag = c.existingId ? (c.wasNested ? '   (moved up from Club list)' : '   (updated)') : '   (new)';
    console.log(`  ${c.name}  →  ${c.href}${tag}`);
  }

  if (COMMIT) {
    for (const c of plan) {
      if (c.existingId) {
        await prisma.mainNavItem.update({
          where: { id: c.existingId },
          // parentId: null lifts it to the top level of the dropdown.
          data: { name: c.name, parentId: null, displayOrder: c.displayOrder },
        });
      } else {
        await prisma.mainNavItem.create({
          data: {
            groupId: group.id,
            parentId: null,
            name: c.name,
            href: c.href,
            displayOrder: c.displayOrder,
          },
        });
      }
    }
    console.log(`\nWrote ${plan.length} nav items.`);
  }
} finally {
  await prisma.$disconnect();
}
