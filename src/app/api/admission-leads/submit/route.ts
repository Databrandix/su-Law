import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getAdmissionLeadPopup } from '@/lib/identity';
import { admissionLeadCreateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

// Honeypot field name — must match the hidden input in
// AdmissionLeadPopup. Real users never fill it (hidden via CSS); bots
// fill every input they find. On a trip we answer 200 OK so the bot
// logs a success and doesn't go looking for another way in.
const HONEYPOT_FIELD = 'website';

function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first) return first.trim();
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const honeypotValue = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (typeof honeypotValue === 'string' && honeypotValue.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // Own bucket namespace so a hammered lead popup can't lock out the
  // contact form or newsletter signup (and vice versa).
  const limit = checkRateLimit(`admission-lead:${ip ?? 'no-ip'}`);
  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetMs - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many submissions from your connection. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const parsed = admissionLeadCreateSchema.safeParse(body);
  if (!parsed.success) {
    // Surface the first message verbatim — these are user-facing and
    // already phrased for a visitor (e.g. the mobile-number hint).
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: first?.message ?? 'Please check the form and try again.',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const config = await getAdmissionLeadPopup();
  if (!config || !config.isEnabled) {
    return NextResponse.json(
      { error: 'Admission enquiries are closed at the moment.' },
      { status: 403 },
    );
  }

  // The dropdown posts a label, so confirm it is one this site actually
  // offers before storing it. Without this a crafted POST could write
  // arbitrary text into a column the admission team reads as a
  // programme name.
  if (!config.programmeOptions.includes(parsed.data.programme)) {
    return NextResponse.json(
      { error: 'Please choose a programme from the list.' },
      { status: 400 },
    );
  }

  try {
    await prisma.admissionLead.create({
      data: {
        fullName:  parsed.data.fullName,
        mobile:    parsed.data.mobile,
        programme: parsed.data.programme,
        ipAddress: ip,
        userAgent: userAgent ?? null,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Database error' },
      { status: 500 },
    );
  }

  // Admin list + dashboard counter pick the new lead up.
  revalidatePath('/admin/admission-leads');
  revalidatePath('/admin');

  return NextResponse.json({ ok: true });
}
