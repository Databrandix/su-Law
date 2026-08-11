'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
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

/**
 * The office directory is one textarea, one office per line:
 *
 *   Office of the Registrar | Level 01
 *   * Office of the Head, Department of Law | Level 02
 *
 * A leading `*` marks the department's own offices, which render in the
 * brand colour. A plain-text format keeps a 22-row table editable
 * without a bespoke repeater UI.
 */
function parseOffices(fd: FormData) {
  const raw = fd.get('offices');
  if (typeof raw !== 'string') return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const highlight = line.startsWith('*');
      const body = highlight ? line.slice(1).trim() : line;
      // rsplit on the last '|' so an office name may contain one.
      const cut = body.lastIndexOf('|');
      return cut === -1
        ? { name: body, level: '', highlight }
        : {
            name: body.slice(0, cut).trim(),
            level: body.slice(cut + 1).trim(),
            highlight,
          };
    })
    .filter((o) => o.name && o.level);
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
    deptName:          emptyToNull(formData.get('deptName')),
    address:           emptyToNull(formData.get('address')),
    offices:           parseOffices(formData),
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

  // paragraphs + offices are Json columns; Zod validates their shape but
  // Prisma's input type is the generic InputJsonValue.
  const data = {
    ...parsed.data,
    offices: parsed.data.offices as Prisma.InputJsonValue,
  };

  try {
    await prisma.aboutDepartmentLayout.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }

  revalidatePath('/admin/about-department-layout');
  revalidatePath('/admin');
  revalidatePath('/about/department-layout');
  return { ok: true };
}
