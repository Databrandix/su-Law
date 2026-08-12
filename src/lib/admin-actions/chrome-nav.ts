'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import {
  type ActionResult,
  getStr,
  emptyToNull,
  readBoolCheckbox,
  readLinkRow,
  validateLinkRow,
} from './_link-actions';

export type { ActionResult };

async function requireAuth(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  return null;
}

// All chrome surfaces (Navbar) live on the root layout, so any chrome
// mutation invalidates every public route via 'layout' scope.
function revalidateChrome() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/nav');
  revalidatePath('/admin');
}

// ─────────────────────────────────────────────────────────────────
//  TopLink
// ─────────────────────────────────────────────────────────────────

export async function createTopLinkAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readLinkRow(formData);
  const invalid = validateLinkRow(row);
  if (invalid) return invalid;
  const last = await prisma.topLink.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
  const displayOrder = (last?.displayOrder ?? -1) + 1;
  try {
    await prisma.topLink.create({ data: { ...row, displayOrder } });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function updateTopLinkAction(id: string, formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readLinkRow(formData);
  const invalid = validateLinkRow(row);
  if (invalid) return invalid;
  try {
    await prisma.topLink.update({ where: { id }, data: row });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Top link not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function deleteTopLinkAction(id: string): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    await prisma.topLink.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Top link not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function reorderTopLinksAction(ids: string[]): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const existing = await prisma.topLink.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((r) => r.id));
  if (ids.length !== existingIds.size || !ids.every((id) => existingIds.has(id))) {
    return { ok: false, error: 'Reorder list must include exactly the existing rows' };
  }
  try {
    await prisma.$transaction(
      ids.map((id, index) => prisma.topLink.update({ where: { id }, data: { displayOrder: index } })),
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
//  QuickAccessItem (LinkRow + iconName)
// ─────────────────────────────────────────────────────────────────

function readQuickAccessRow(fd: FormData) {
  const link = readLinkRow(fd);
  return { ...link, iconName: getStr(fd, 'iconName') };
}

function validateQuickAccessRow(row: ReturnType<typeof readQuickAccessRow>): ActionResult | null {
  const invalid = validateLinkRow(row);
  if (invalid) return invalid;
  if (!row.iconName) return { ok: false, error: 'Lucide icon name is required' };
  return null;
}

export async function createQuickAccessAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readQuickAccessRow(formData);
  const invalid = validateQuickAccessRow(row);
  if (invalid) return invalid;
  const last = await prisma.quickAccessItem.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
  const displayOrder = (last?.displayOrder ?? -1) + 1;
  try {
    await prisma.quickAccessItem.create({ data: { ...row, displayOrder } });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function updateQuickAccessAction(id: string, formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readQuickAccessRow(formData);
  const invalid = validateQuickAccessRow(row);
  if (invalid) return invalid;
  try {
    await prisma.quickAccessItem.update({ where: { id }, data: row });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Quick access item not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function deleteQuickAccessAction(id: string): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    await prisma.quickAccessItem.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Quick access item not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function reorderQuickAccessAction(ids: string[]): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const existing = await prisma.quickAccessItem.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((r) => r.id));
  if (ids.length !== existingIds.size || !ids.every((id) => existingIds.has(id))) {
    return { ok: false, error: 'Reorder list must include exactly the existing rows' };
  }
  try {
    await prisma.$transaction(
      ids.map((id, index) => prisma.quickAccessItem.update({ where: { id }, data: { displayOrder: index } })),
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
//  MainNavGroup
// ─────────────────────────────────────────────────────────────────

function readGroupRow(fd: FormData) {
  return {
    name:        getStr(fd, 'name'),
    href:        emptyToNull(fd.get('href')),
    hasDropdown: readBoolCheckbox(fd, 'hasDropdown'),
    title:       emptyToNull(fd.get('title')),
  };
}

function validateGroupRow(row: ReturnType<typeof readGroupRow>): ActionResult | null {
  if (!row.name) return { ok: false, error: 'Group name is required' };
  if (!row.hasDropdown && !row.href) {
    return { ok: false, error: 'Plain link groups (no dropdown) must have an href' };
  }
  return null;
}

export async function createMainNavGroupAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readGroupRow(formData);
  const invalid = validateGroupRow(row);
  if (invalid) return invalid;
  const last = await prisma.mainNavGroup.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
  const displayOrder = (last?.displayOrder ?? -1) + 1;
  try {
    await prisma.mainNavGroup.create({ data: { ...row, displayOrder } });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function updateMainNavGroupAction(id: string, formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readGroupRow(formData);
  const invalid = validateGroupRow(row);
  if (invalid) return invalid;
  try {
    await prisma.mainNavGroup.update({ where: { id }, data: row });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Nav group not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function deleteMainNavGroupAction(id: string): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    // Cascade on the FK drops children automatically.
    await prisma.mainNavGroup.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Nav group not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function reorderMainNavGroupsAction(ids: string[]): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const existing = await prisma.mainNavGroup.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((r) => r.id));
  if (ids.length !== existingIds.size || !ids.every((id) => existingIds.has(id))) {
    return { ok: false, error: 'Reorder list must include exactly the existing groups' };
  }
  try {
    await prisma.$transaction(
      ids.map((id, index) => prisma.mainNavGroup.update({ where: { id }, data: { displayOrder: index } })),
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
//  MainNavItem  (nested under MainNavGroup)
// ─────────────────────────────────────────────────────────────────

function readItemRow(fd: FormData) {
  // parentId: '' from the "— none —" option means top level, which the
  // column stores as null.
  const parent = getStr(fd, 'parentId');
  return {
    name:       getStr(fd, 'name'),
    href:       getStr(fd, 'href'),
    isExternal: readBoolCheckbox(fd, 'isExternal'),
    isDisabled: readBoolCheckbox(fd, 'isDisabled'),
    parentId:   parent === '' ? null : parent,
  };
}

/**
 * Checks a requested parent is a legal one.
 *
 * The form only ever offers same-group, top-level items, but the id
 * arrives in FormData and a caller can send anything — so the rules are
 * enforced here rather than trusted from the client:
 *
 *   - the parent must exist
 *   - it must be in the same group, or the item would render under a
 *     dropdown it does not belong to
 *   - it must itself be top level: the renderer draws one flyout level
 *     and ignores children of children, so a deeper nest would silently
 *     hide the item
 *   - it must not be the item itself, which would orphan it from the
 *     tree and make it unreachable in the admin list
 */
async function validateParent(
  parentId: string | null,
  groupId: string,
  selfId?: string,
): Promise<ActionResult | null> {
  if (parentId === null) return null;
  if (selfId && parentId === selfId) {
    return { ok: false, error: 'An item cannot be its own parent' };
  }
  const parent = await prisma.mainNavItem.findUnique({
    where: { id: parentId },
    select: { groupId: true, parentId: true },
  });
  if (!parent) return { ok: false, error: 'Parent item not found' };
  if (parent.groupId !== groupId) {
    return { ok: false, error: 'Parent must be in the same nav group' };
  }
  if (parent.parentId !== null) {
    return { ok: false, error: 'Only one level of nesting is supported' };
  }
  return null;
}

function validateItemRow(row: ReturnType<typeof readItemRow>): ActionResult | null {
  if (!row.name) return { ok: false, error: 'Item name is required' };
  if (!row.href) return { ok: false, error: 'Item href is required' };
  return null;
}

export async function createMainNavItemAction(groupId: string, formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readItemRow(formData);
  const invalid = validateItemRow(row);
  if (invalid) return invalid;
  const badParent = await validateParent(row.parentId, groupId);
  if (badParent) return badParent;
  // Order within the sibling set: children are ordered among their own
  // parent's children, not against the group's top-level items.
  const last = await prisma.mainNavItem.findFirst({
    where: { groupId, parentId: row.parentId },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });
  const displayOrder = (last?.displayOrder ?? -1) + 1;
  try {
    await prisma.mainNavItem.create({ data: { ...row, groupId, displayOrder } });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function updateMainNavItemAction(id: string, formData: FormData): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const row = readItemRow(formData);
  const invalid = validateItemRow(row);
  if (invalid) return invalid;

  const current = await prisma.mainNavItem.findUnique({
    where: { id },
    select: { groupId: true, parentId: true, _count: { select: { children: true } } },
  });
  if (!current) return { ok: false, error: 'Nav item not found' };

  const badParent = await validateParent(row.parentId, current.groupId, id);
  if (badParent) return badParent;

  // Moving an item that has children under another parent would push
  // its own children to a third level, which the renderer does not
  // draw — they would vanish from the site with no warning.
  if (row.parentId !== null && current._count.children > 0) {
    return {
      ok: false,
      error: `"Move under" is unavailable: this item has ${current._count.children} child item(s). Move or delete them first.`,
    };
  }

  try {
    await prisma.mainNavItem.update({ where: { id }, data: row });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Nav item not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function deleteMainNavItemAction(id: string): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    await prisma.mainNavItem.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Nav item not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}

export async function reorderMainNavItemsAction(groupId: string, ids: string[]): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;
  const existing = await prisma.mainNavItem.findMany({
    where: { groupId },
    select: { id: true, parentId: true },
  });
  const existingIds = new Set(existing.map((r) => r.id));
  if (ids.length !== existingIds.size || !ids.every((id) => existingIds.has(id))) {
    return { ok: false, error: 'Reorder list must include exactly the existing items in this group' };
  }

  // The admin list shows children inline under their parents, so the
  // dragged order mixes both levels. displayOrder ranks an item among
  // its SIBLINGS, so numbering the flat list 0..n would interleave the
  // two levels and scramble the menu. Each parent group is numbered
  // separately, preserving the dragged sequence within each.
  const parentOf = new Map(existing.map((r) => [r.id, r.parentId]));
  const counters = new Map<string, number>();
  const updates = ids.map((id) => {
    const key = parentOf.get(id) ?? '__top__';
    const next = counters.get(key) ?? 0;
    counters.set(key, next + 1);
    return prisma.mainNavItem.update({ where: { id }, data: { displayOrder: next } });
  });

  try {
    await prisma.$transaction(updates);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }
  revalidateChrome();
  return { ok: true };
}
