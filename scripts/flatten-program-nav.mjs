/**
 * Turn the "Program" nav group into a plain link to /programs, the
 * same shape "Faculty Member" and "Contact" already use:
 *
 *   before:  Program ▾ → Undergraduate ▸ Bachelor of Laws (LL.B.)
 *                      → Graduate      ▸ Master of Laws (LL.M.)
 *   after:   Program   → /programs
 *
 * Undoes scripts/add-program-nav-children.mjs. Both degree pages stay
 * reachable — /programs lists them — so only the nav rows go.
 *
 * The dropdown panel renders whenever a group has items (Navbar.tsx
 * `group.items.length > 0`), independently of hasDropdown, so clearing
 * the flag alone would leave the panel on screen. The items have to be
 * deleted as well; their third-level children go with them via the
 * schema's onDelete: Cascade on NavItemChildren.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/flatten-program-nav.mjs
 *   node --env-file=.env scripts/flatten-program-nav.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const HREF = '/programs';
const prisma = new PrismaClient();

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

  console.log(COMMIT ? '\n=== COMMIT ===\n' : '\n=== DRY RUN (pass --commit to write) ===\n');

  console.log('Group:');
  console.log(`  href         ${group.href ?? 'null'}  →  ${HREF}`);
  console.log(`  hasDropdown  ${group.hasDropdown}  →  false`);
  console.log(`  title        ${group.title ?? 'null'}  →  null`);

  const childCount = group.items.reduce((n, i) => n + i.children.length, 0);
  console.log(`\nDropdown rows to delete (${group.items.length} item(s), ${childCount} child(ren)):`);
  for (const item of group.items) {
    console.log(`  - ${item.name}  →  ${item.href}`);
    for (const c of item.children) console.log(`      · ${c.name}  →  ${c.href}`);
  }
  if (!group.items.length) console.log('  (none — already flat)');
  console.log();

  if (COMMIT) {
    await prisma.$transaction([
      // Children cascade from their parent rows.
      prisma.mainNavItem.deleteMany({ where: { groupId: group.id, parentId: null } }),
      prisma.mainNavGroup.update({
        where: { id: group.id },
        data: { href: HREF, hasDropdown: false, title: null },
      }),
    ]);
    console.log(`Program is now a plain link to ${HREF}.`);
  }
} finally {
  await prisma.$disconnect();
}
