'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import {
  admissionLeadPopupUpdateSchema,
  admissionLeadStatusEnum,
} from '@/lib/validation';

export type ActionResult = { ok: true } | { ok: false; error: string };

function getStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function getBool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on';
}

// Blank must become undefined, not '': the schema coerces numbers, and
// Number('') is 0 — an empty delay field would silently mean "open
// immediately" instead of falling back to the default.
function getNum(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (typeof v !== 'string' || v.trim().length === 0) return undefined;
  return v.trim();
}

async function requireAuth(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  return null;
}

export async function updateAdmissionLeadPopupAction(
  _prev: ActionResult | { ok: null },
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;

  const raw = {
    isEnabled:            getBool(formData, 'isEnabled'),
    delaySeconds:         getNum(formData, 'delaySeconds'),
    redisplayAfterHours:  getNum(formData, 'redisplayAfterHours'),
    heading:              getStr(formData, 'heading'),
    subheading:           getStr(formData, 'subheading'),
    nameLabel:            getStr(formData, 'nameLabel'),
    namePlaceholder:      getStr(formData, 'namePlaceholder'),
    mobileLabel:          getStr(formData, 'mobileLabel'),
    mobilePlaceholder:    getStr(formData, 'mobilePlaceholder'),
    programmeLabel:       getStr(formData, 'programmeLabel'),
    programmePlaceholder: getStr(formData, 'programmePlaceholder'),
    submitLabel:          getStr(formData, 'submitLabel'),
    footerNote:           getStr(formData, 'footerNote'),
    // The editor emits one hidden input per option under this name.
    programmeOptions:     formData
      .getAll('programmeOptions')
      .filter((v): v is string => typeof v === 'string'),
  };

  const parsed = admissionLeadPopupUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; '),
    };
  }

  const data = {
    ...parsed.data,
    programmeOptions: parsed.data.programmeOptions as unknown as Prisma.InputJsonValue,
  };

  try {
    await prisma.admissionLeadPopup.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }

  // The homepage renders the popup, so it has to drop its cached copy
  // for a copy or timing change to take effect.
  revalidatePath('/');
  revalidatePath('/admin/admission-lead-popup');
  revalidatePath('/admin');
  return { ok: true };
}

export async function updateAdmissionLeadStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;

  const parsed = admissionLeadStatusEnum.safeParse(status);
  if (!parsed.success) return { ok: false, error: 'Invalid status' };

  try {
    await prisma.admissionLead.update({
      where: { id },
      data: { status: parsed.data },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, error: 'Lead not found' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }

  revalidatePath('/admin/admission-leads');
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteAdmissionLeadAction(id: string): Promise<ActionResult> {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    await prisma.admissionLead.delete({ where: { id } });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { ok: false, error: 'Lead not found' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Database error' };
  }

  revalidatePath('/admin/admission-leads');
  revalidatePath('/admin');
  return { ok: true };
}
