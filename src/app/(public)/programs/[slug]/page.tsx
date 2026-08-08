import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { DynamicLucideIcon } from '@/components/ui/DynamicLucideIcon';
import { getProgramBySlug, getProgramSlugs, getPageHero } from '@/lib/identity';
import { sanitizeHtml } from '@/lib/sanitize-html';

const DEFAULT_PROGRAM_IMAGE = '/assets/program-undergraduate.webp';

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
    title: `${program.programName} — Department of Business Administration`,
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
        {/* ───── Overview: prose beside the program image ───── */}
        <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start mb-14 md:mb-20">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-[1.5px] w-10 bg-accent/40" />
              <span className="text-accent text-[10px] font-bold uppercase tracking-[0.2em]">
                Program Overview
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-primary leading-tight mb-5">
              {program.degreeCode}
            </h2>

            {paragraphs.length > 0 ? (
              <div className="space-y-5 text-[15px] md:text-[16px] leading-[1.85] text-gray-800 text-justify">
                {paragraphs.map((p, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: sanitizeHtml(p) }} />
                ))}
              </div>
            ) : (
              <p className="text-[15px] md:text-[16px] leading-[1.85] text-gray-800 text-justify">
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
          </div>

          <div className="relative overflow-hidden rounded-2xl shadow-lg lg:sticky lg:top-32">
            <Image
              src={program.imageUrl ?? DEFAULT_PROGRAM_IMAGE}
              alt={program.programName}
              width={840}
              height={630}
              sizes="(min-width: 1024px) 420px, 100vw"
              priority
              className="block h-auto w-full object-cover"
            />
          </div>
        </section>

        {/* ───── Key facts — reuses the fee structure's stat cards ─────
            One bordered panel holding the stats as divided columns,
            rather than four detached boxes floating on a grey field.
            The shared frame reads as a single spec sheet and removes
            the ragged gaps the old separate cards left. */}
        {stats.length > 0 && (
          <section className="mb-14 md:mb-20">
            <SectionHeader Icon={Layers} title="At a Glance" />
            <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(43,49,117,0.16)]">
              <div className="grid divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
                {stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    className={`group relative p-6 lg:p-7 ${
                      // Vertical rules between columns at each breakpoint,
                      // and a horizontal rule between the two sm-rows.
                      i % 2 === 1 ? 'sm:border-l sm:border-gray-100' : ''
                    } ${i >= 2 ? 'sm:border-t sm:border-gray-100 lg:border-t-0' : ''} ${
                      i > 0 ? 'lg:border-l lg:border-gray-100' : ''
                    }`}
                  >
                    {/* Accent hairline that fills in on hover. */}
                    <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-primary to-accent transition-transform duration-300 group-hover:scale-x-100" />
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-inset ring-primary/10 transition-colors group-hover:from-primary group-hover:to-accent group-hover:text-white group-hover:ring-transparent">
                      <DynamicLucideIcon name={stat.iconName ?? ''} size={20} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                      {stat.label}
                    </div>
                    <div className="mt-1.5 font-display text-[26px] font-bold leading-none tracking-tight text-primary lg:text-[28px]">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── Specializations ─────
            Auto-fit tracks so a trailing row of 1–2 items stretches to
            fill the width instead of leaving a hole on the right, which
            is what made the old fixed 3-column grid look unfinished. */}
        {program.specializations.length > 0 && (
          <section className="mb-14 md:mb-20">
            <SectionHeader Icon={GraduationCap} title="Specializations" />
            <div className="grid gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {program.specializations.map((spec) => (
                <div
                  key={spec}
                  className="group relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_12px_28px_-12px_rgba(204,21,121,0.28)]"
                >
                  {/* Left accent bar, revealed on hover. */}
                  <span className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-gradient-to-b from-primary to-accent transition-transform duration-300 group-hover:scale-y-100" />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <CheckCircle2 size={18} />
                  </span>
                  <span className="text-[15px] font-semibold leading-snug text-primary">
                    {spec}
                  </span>
                </div>
              ))}
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

function SectionHeader({
  Icon,
  title,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
}) {
  // Icon and title sit on one line with a rule running to the right
  // edge, so the heading anchors the section instead of floating as a
  // stacked centre badge above it.
  return (
    <div className="mb-6 flex items-center gap-4 md:mb-8">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-[0_6px_16px_-6px_rgba(43,49,117,0.6)]">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight text-primary md:text-[26px]">
        {title}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
    </div>
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
