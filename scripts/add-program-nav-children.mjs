/**
 * Hang the two degree programmes off the Program dropdown as a third
 * nav level, so hovering "Undergraduate" / "Graduate" reveals the
 * actual degree:
 *
 *     Program ▸ Undergraduate ▸ Bachelor of Laws (LL.B.)
 *             ▸ Graduate      ▸ Master of Laws (LL.M.)
 *
 * Children are ordinary MainNavItem rows with parentId set — the nav
 * table is self-referential (schema.prisma "NavItemChildren"), so no
 * new table is involved. Navbar renders one extra level only.
 *
 * Labels and hrefs come from the Program table rather than being
 * hard-coded, so a rename in /admin/programs stays in sync with what
 * the flyout says. Re-running is safe: an existing child with the same
 * href is updated in place instead of duplicated.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/add-program-nav-children.mjs
 *   node --env-file=.env scripts/add-program-nav-children.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

// Which dropdown item each programme hangs under, keyed by the
// programme's `overline` — the same field that labels it on /programs.
const PARENT_BY_OVERLINE = {
  Undergraduate: 'Undergraduate',
  Graduate: 'Graduate',
};

try {
  const group = await prisma.mainNavGroup.findFirst({
    where: { name: 'Program' },
    include: {
      items: {
        where: { parentId: null },
        orderBy: { displayOrder: 'asc' },
        include: { children: { orderBy: { displayOrder: 'asc' } } },
      },
    },
  });

  if (!group) throw new Error('No "Program" nav group found.');

  const programs = await prisma.program.findMany({
    orderBy: { displayOrder: 'asc' },
    select: { programName: true, degreeCode: true, slug: true, overline: true },
  });

  const plan = [];

  for (const p of programs) {
    if (!p.slug) {
      console.log(`!! "${p.programName}" has no slug — skipped (no page to link to)`);
      continue;
    }

    const parentName = PARENT_BY_OVERLINE[p.overline ?? ''];
    if (!parentName) {
      console.log(`!! "${p.programName}" overline="${p.overline}" — no matching nav item, skipped`);
      continue;
    }

    const parent = group.items.find((i) => i.name === parentName);
    if (!parent) {
      console.log(`!! nav item "${parentName}" not found under Program — skipped`);
      continue;
    }

    // "Bachelor of Laws" + "LL.B" → "Bachelor of Laws (LL.B.)". The
    // degreeCode is stored without the trailing dot.
    const code = p.degreeCode ? p.degreeCode.replace(/\.?$/, '.') : null;
    const label = code ? `${p.programName} (${code})` : p.programName;
    const href = `/programs/${p.slug}`;

    const existing = parent.children.find((c) => c.href === href);

    plan.push({
      parentId: parent.id,
      parentName,
      existingId: existing?.id ?? null,
      existingName: existing?.name ?? null,
      label,
      href,
      displayOrder: parent.children.length ? parent.children.length + 1 : 1,
    });
  }

  console.log(COMMIT ? '\n=== COMMIT ===\n' : '\n=== DRY RUN (pass --commit to write) ===\n');

  console.log('Program dropdown after this change:\n');
  for (const item of group.items) {
    console.log(`  ${item.name}  →  ${item.href}`);
    const added = plan.filter((x) => x.parentName === item.name);
    for (const c of item.children) {
      const touched = added.find((x) => x.existingId === c.id);
      console.log(`      · ${touched ? touched.label : c.name}  →  ${c.href}${touched ? '   (updated)' : ''}`);
    }
    for (const c of added.filter((x) => !x.existingId)) {
      console.log(`      · ${c.label}  →  ${c.href}   (new)`);
    }
  }
  console.log();

  if (COMMIT) {
    for (const c of plan) {
      if (c.existingId) {
        await prisma.mainNavItem.update({
          where: { id: c.existingId },
          data: { name: c.label },
        });
      } else {
        await prisma.mainNavItem.create({
          data: {
            groupId: group.id,
            parentId: c.parentId,
            name: c.label,
            href: c.href,
            displayOrder: c.displayOrder,
          },
        });
      }
    }
    console.log(`Wrote ${plan.length} nav children.`);
  }
} finally {
  await prisma.$disconnect();
}
