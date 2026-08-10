import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { businessClubApplicationCreateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

// Honeypot field name — must match the hidden input in
// JoinClubModalButton. Real users never fill it; bots fill all inputs.
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

  // Dedicated namespace so the bucket is not shared with the
  // contact form or the newsletter signup.
  const rateLimitKey = `club-apply:${ip ?? 'no-ip'}`;
  const limit = checkRateLimit(rateLimitKey);
  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetMs - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many submissions from your IP. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const parsed = businessClubApplicationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Please double-check the form fields and try again.',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  // Resolve the club server-side rather than trusting a posted name:
  // the slug must match a real club, and the name stored is the one in
  // the database. An unknown slug is a 400 so a stale cached page can't
  // silently file applications against a club that no longer exists.
  const { clubSlug, ...applicant } = parsed.data;
  const club = await prisma.club.findUnique({
    where: { slug: clubSlug },
    select: { slug: true, name: true },
  });
  if (!club) {
    return NextResponse.json(
      { error: 'That club is no longer accepting applications.' },
      { status: 400 },
    );
  }

  try {
    await prisma.businessClubApplication.create({
      data: {
        ...applicant,
        // Normalize email so duplicates only differ by case still group.
        email: applicant.email.toLowerCase(),
        clubSlug: club.slug,
        clubName: club.name,
        ipAddress: ip,
        userAgent: userAgent ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Database error' },
      { status: 500 },
    );
  }

  revalidatePath('/admin/club-applications');
  revalidatePath('/admin');

  return NextResponse.json({ ok: true });
}
