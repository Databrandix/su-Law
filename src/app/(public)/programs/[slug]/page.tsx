import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { DynamicLucideIcon } from '@/components/ui/DynamicLucideIcon';
import { getProgramBySlug, getProgramSlugs, getPageHero } from '@/lib/identity';
import { sanitizeHtml } from '@/lib/sanitize-html';

export async function generateStaticParams() {
  const slugs = await getProgramSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) return { title: 'Program not found' };

  return {
    title: `${program.programName} — Department of Law`,
    description: program.description,
    openGraph: {
      title: `${program.programName} — Sonargaon University`,
      description: program.description,
      images: program.imageUrl ? [{ url: program.imageUrl }] : undefined,
    },
  };
}

// overviewParagraphs is Json — narrow it to the string[] the page needs
// rather than trusting the column shape at render time.
function coerceParagraphs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === 'string' && s.length > 0);
}

type StatCard = { iconName?: string; label: string; value: string };

function coerceStats(v: unknown): StatCard[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      iconName: typeof r.iconName === 'string' ? r.iconName : undefined,
      label: typeof r.label === 'string' ? r.label : '',
      value: typeof r.value === 'string' ? r.value : '',
    }))
    .filter((r) => r.label && r.value);
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [program, hero] = await Promise.all([
    getProgramBySlug(slug),
    getPageHero('programs'),
  ]);
  if (!program) notFound();

  const paragraphs = coerceParagraphs(program.overviewParagraphs);
  const careerIntro = coerceParagraphs(program.careerIntro);
  const stats = coerceStats(program.feeStructure?.overviewStats);

  return (
    <PageShell
      title={program.programName}
      subtitle={hero?.heroSubtitle ?? undefined}
      overline={program.overline || hero?.heroOverline || 'Programs'}
      image={hero?.heroImageUrl ?? undefined}
      imagePosition={hero ? `center ${hero.heroImageVerticalPercent}%` : undefined}
      contentClassName="bg-gray-50 py-12 md:py-20"
    >
      <Container>
        {/* ───── Overview ─────
            Centered, narrow column — matches the "At a Glance" /
            Specializations layout the chair asked to follow, so this
            page reads as one consistent centered layout rather than a
            left-aligned block on top of a centered one below. */}
        <section className="mb-14 md:mb-20 mx-auto max-w-4xl text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-[1.5px] w-10 bg-accent/40" />
              <span className="text-accent text-[10px] font-bold uppercase tracking-[0.2em]">
                Program Overview
              </span>
              <span className="h-[1.5px] w-10 bg-accent/40" />
            </div>
            {/* Full programme name, not the short degree code — the
                hero above already carries the name, and "Master of Laws"
                reads as a heading where "LL.M" reads as an abbreviation
                stranded on its own line. */}
            <h2 className="font-display text-2xl md:text-3xl font-bold text-primary leading-tight mb-5">
              {program.programName}
            </h2>

            {paragraphs.length > 0 ? (
              <div className="space-y-5 text-[15px] md:text-[16px] leading-[1.85] text-gray-800">
                {paragraphs.map((p, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: sanitizeHtml(p) }} />
                ))}
              </div>
            ) : (
              <p className="text-[15px] md:text-[16px] leading-[1.85] text-gray-800">
                {program.description}
              </p>
            )}

            {/* Duration pill — hidden when the programme has no
                published duration, so the clock icon never sits alone. */}
            {program.duration && (
              <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-2">
                <Clock size={16} className="text-accent" />
                <span className="text-[13px] font-semibold text-primary">
                  {program.duration}
                </span>
              </div>
            )}
        </section>

        {/* ───── Key facts ─────
            Four detached cards on the grey field, each centred with its
            icon above the label — the treatment the chair asked to
            follow. Two columns on mobile so the labels stay readable,
            four from lg. */}
        {stats.length > 0 && (
          <section className="mb-14 md:mb-20">
            <h2 className="mb-8 text-center font-display text-xl font-bold text-primary md:text-2xl">
              At a Glance
            </h2>
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-md">
                    <DynamicLucideIcon name={stat.iconName ?? ''} size={20} strokeWidth={1.75} />
                  </div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {stat.label}
                  </div>
                  <div className="font-display text-lg font-bold leading-tight text-primary md:text-xl">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Specializations ─────
            One white panel with the heading inside it and the entries as
            tinted pills, matching the reference. */}
        {program.specializations.length > 0 && (
          <section className="mx-auto mb-14 max-w-6xl md:mb-20">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm md:p-10">
              <h2 className="mb-6 text-center font-display text-xl font-bold text-primary md:text-2xl">
                Specializations
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {program.specializations.map((spec) => (
                  <div
                    key={spec}
                    className="flex items-center gap-3 rounded-lg bg-primary/5 px-4 py-3"
                  >
                    <CheckCircle2 size={20} className="shrink-0 text-accent" />
                    <span className="text-[15px] font-semibold text-primary">{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── Career Prospects ─────
            Reference's treatment: a heading above one white card, the
            prose held to a narrower measure inside it, everything in the
            same body type. The role list sits between the lead-in
            paragraph and the closing one. */}
        {(careerIntro.length > 0 || program.careerRoles.length > 0) && (
          <section className="mx-auto mb-14 max-w-6xl md:mb-20">
            <h2 className="mb-6 text-center font-display text-xl font-bold text-primary md:text-2xl">
              Career Prospects
            </h2>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm md:p-10">
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {/* First entry introduces the list, so it sits above it;
                    anything after the first is closing copy and follows
                    the list. */}
                {careerIntro.slice(0, 1).map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.85] text-gray-700">
                    {p}
                  </p>
                ))}

                {program.careerRoles.length > 0 && (
                  <ul className="flex flex-col gap-2.5">
                    {program.careerRoles.map((role) => (
                      <li key={role} className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="mt-1 shrink-0 text-accent" />
                        <span className="text-[15px] leading-[1.85] text-gray-700">
                          {role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {careerIntro.slice(1).map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.85] text-gray-700">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── Next steps ───── */}
        <section className="relative overflow-hidden rounded-2xl bg-primary text-white shadow-lg">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative grid gap-6 p-7 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <span className="mb-2 inline-block text-[10px] font-bold uppercase tracking-[0.3em] text-button-yellow">
                Next Steps
              </span>
              <h2 className="font-display text-xl font-bold md:text-2xl">
                Ready to apply for the {program.degreeCode} program?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
                Review the eligibility criteria, tuition fee structure, and the
                waivers and scholarships available to new students.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <CtaLink href="/admission/requirements" primary>
                Admission Requirements
              </CtaLink>
              <CtaLink href="/admission/tuition-fees">Tuition Fees</CtaLink>
            </div>
          </div>
        </section>
      </Container>
    </PageShell>
  );
}

function CtaLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all ${
        primary
          ? 'bg-accent text-white shadow-md hover:bg-accent/90'
          : 'border border-white/30 text-white hover:border-white hover:bg-white/10'
      }`}
    >
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
