'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { clubDetailSchema } from '@/lib/validation';

export type ActionResult = { ok: true } | { ok: false; error: string };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// stats + activities arrive as a single JSON-encoded hidden input each
// (the editor components serialize the array client-side).
function parseJsonArray(fd: FormData, key: string): unknown {
  const raw = fd.get(key);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Saves the detail page of one club, addressed by slug. The club row
 * itself (name, card description, cover image) is edited under Clubs;
 * this action never touches those columns.
 */
export async function updateClubDetailAction(
  slug: string,
  _prev: ActionResult | { ok: null },
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };

  const parsed = clubDetailSchema.safeParse({
    heroTitle:          emptyToNull(formData.get('heroTitle')),
    heroOverline:       emptyToNull(formData.get('heroOverline')),
    heroImageUrl:       emptyToNull(formData.get('heroImageUrl')),
    heroImagePublicId:  emptyToNull(formData.get('heroImagePublicId')),
    introOverline:      emptyToNull(formData.get('introOverline')),
    introHeading:       emptyToNull(formData.get('introHeading')),
    introBody1:         emptyToNull(formData.get('introBody1')),
    introBody2:         emptyToNull(formData.get('introBody2')),
    introImageUrl:      emptyToNull(formData.get('introImageUrl')),
    introImagePublicId: emptyToNull(formData.get('introImagePublicId')),
    stats:              parseJsonArray(formData, 'stats'),
    activitiesOverline: emptyToNull(formData.get('activitiesOverline')),
    activitiesHeading:  emptyToNull(formData.get('activitiesHeading')),
    activities:         parseJsonArray(formData, 'activities'),
    networkOverline:          emptyToNull(formData.get('networkOverline')),
    networkHeading:           emptyToNull(formData.get('networkHeading')),
    networkBody:              emptyToNull(formData.get('networkBody')),
    networkPrimaryCtaLabel:   emptyToNull(formData.get('networkPrimaryCtaLabel')),
    networkPrimaryCtaHref:    emptyToNull(formData.get('networkPrimaryCtaHref')),
    networkSecondaryCtaLabel: emptyToNull(formData.get('networkSecondaryCtaLabel')),
    networkSecondaryCtaHref:  emptyToNull(formData.get('networkSecondaryCtaHref')),
    contactHeading: emptyToNull(formData.get('contactHeading')),
    contactPhone:   emptyToNull(formData.get('contactPhone')),
    contactHours:   emptyToNull(formData.get('contactHours')),
    contactEmail:   emptyToNull(formData.get('contactEmail')),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; '),
    };
  }

  // `introHeading` renders through dangerouslySetInnerHTML on the public
  // page, so it is sanitized here — the same treatment the Business Club
  // heading gets. Json columns need the generic InputJsonValue cast.
  const data = {
    ...parsed.data,
    introHeading: parsed.data.introHeading ? sanitizeHtml(parsed.data.introHeading) : null,
    stats:        parsed.data.stats as Prisma.InputJsonValue,
    activities:   parsed.data.activities as Prisma.InputJsonValue,
  };

  try {
    await prisma.club.update({ where: { slug }, data });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return { ok: false, error: 'Club not found' };
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }

  revalidatePath(`/admin/about-club/${slug}`);
  revalidatePath('/admin');
  revalidatePath('/student-society/club-list');
  revalidatePath(`/student-society/club-list/${slug}`);
  return { ok: true };
}
