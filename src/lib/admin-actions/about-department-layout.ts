'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import { aboutDepartmentLayoutUpdateSchema } from '@/lib/validation';

export type ActionResult = { ok: true } | { ok: false; error: string };

function getStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export async function updateAboutDepartmentLayoutAction(
  _prev: ActionResult | { ok: null },
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };

  // Intro copy is one textarea, one paragraph per non-empty line.
  const paragraphs = getStr(formData, 'paragraphs')
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const raw = {
    heroTitle:         getStr(formData, 'heroTitle'),
    heroOverline:      emptyToNull(formData.get('heroOverline')),
    heroImageUrl:      getStr(formData, 'heroImageUrl'),
    heroImagePublicId: emptyToNull(formData.get('heroImagePublicId')),
    heroImageVerticalPercent: formData.get('heroImageVerticalPercent') ?? undefined,
    paragraphs,
    cardTitle:         getStr(formData, 'cardTitle'),
    coverUrl:          emptyToNull(formData.get('coverUrl')),
    coverPublicId:     emptyToNull(formData.get('coverPublicId')),
    pdfUrl:            emptyToNull(formData.get('pdfUrl')),
    pdfPublicId:       emptyToNull(formData.get('pdfPublicId')),
    pdfFileName:       emptyToNull(formData.get('pdfFileName')),
  };

  const parsed = aboutDepartmentLayoutUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; '),
    };
  }

  try {
    await prisma.aboutDepartmentLayout.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...parsed.data },
      update: parsed.data,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }

  revalidatePath('/admin/about-department-layout');
  revalidatePath('/admin');
  revalidatePath('/about/department-layout');
  return { ok: true };
}
