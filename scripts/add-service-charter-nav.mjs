/**
 * Adds "Service Charter" to the Student Society dropdown.
 *
 * Appended after the existing items rather than inserted, so nothing
 * already in the menu shifts position.
 *
 * Aborts if an item with this href or name already exists in the group,
 * so re-running cannot create a duplicate menu entry.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

const GROUP_NAME = 'Student Society';
const ITEM_NAME = 'Service Charter';
const ITEM_HREF = '/student-society/service-charter';

const prisma = new PrismaClient();

const group = await prisma.mainNavGroup.findFirst({
  where: { name: GROUP_NAME },
  include: { items: { orderBy: { displayOrder: 'asc' } } },
});
if (!group) {
  console.error(`No nav group named "${GROUP_NAME}".`);
  await prisma.$disconnect();
  process.exit(1);
}
if (!group.hasDropdown) {
  console.error(`"${GROUP_NAME}" is not a dropdown group — cannot add items to it.`);
  await prisma.$disconnect();
  process.exit(1);
}

const clash = group.items.find(
  (i) => i.href === ITEM_HREF || i.name.toLowerCase() === ITEM_NAME.toLowerCase(),
);
if (clash) {
  console.error(`"${clash.name}" (${clash.href}) already exists in this group. Nothing to do.`);
  await prisma.$disconnect();
  process.exit(1);
}

const displayOrder =
  group.items.reduce((max, i) => Math.max(max, i.displayOrder), -1) + 1;

console.log(`Group: ${group.name} (${group.items.length} items)`);
for (const i of group.items.filter((i) => !i.parentId)) {
  console.log(`    ${String(i.displayOrder).padStart(2)} | ${i.name.padEnd(26)} | ${i.href}`);
}
console.log(`\nItem to CREATE:`);
console.log(`  + ${String(displayOrder).padStart(2)} | ${ITEM_NAME.padEnd(26)} | ${ITEM_HREF}`);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

const created = await prisma.mainNavItem.create({
  data: {
    groupId: group.id,
    name: ITEM_NAME,
    href: ITEM_HREF,
    displayOrder,
  },
});
console.log(`\ncreated "${created.name}" at position ${created.displayOrder}.`);
await prisma.$disconnect();
