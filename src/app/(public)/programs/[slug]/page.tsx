import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Info,
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { DynamicLucideIcon } from '@/components/ui/DynamicLucideIcon';
import { getProgramBySlug, getProgramSlugs, getPageHero } from '@/lib/identity';
import { sanitizeHtml } from '@/lib/sanitize-html';
import CourseStructure, { type CourseRow } from './CourseStructure';

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

// `courses` is a Json column — narrow it to the shape the table needs
// rather than trusting the column at render time.
function coerceCourses(v: unknown): CourseRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      semester: typeof r.semester === 'string' ? r.semester : '',
      code:     typeof r.code === 'string' ? r.code : '',
      title:    typeof r.title === 'string' ? r.title : '',
      credits:  typeof r.credits === 'number' && Number.isFinite(r.credits) ? r.credits : 0,
      type:     typeof r.type === 'string' ? r.type : 'Core',
    }))
    .filter((r) => r.code && r.title);
}

/**
 * Group courses into semesters, preserving the curriculum's own order
 * rather than sorting — the workbook lists semesters chronologically
 * and course order within a semester is meaningful.
 */
function groupBySemester(courses: CourseRow[]) {
  const order: string[] = [];
  const bySemester = new Map<string, CourseRow[]>();
  for (const c of courses) {
    if (!bySemester.has(c.semester)) {
      bySemester.set(c.semester, []);
      order.push(c.semester);
    }
    bySemester.get(c.semester)!.push(c);
  }
  return order.map((name) => {
    const rows = bySemester.get(name)!;
    return {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      courses: rows,
      credits: rows.reduce((t, c) => t + c.credits, 0),
    };
  });
}

/** Credits print as "0.75" / "18" rather than "18.00". */
function fmtCredits(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
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
  const courses = coerceCourses(program.courses);
  const semesterGroups = groupBySemester(courses);
  const courseCredits = courses.reduce((t, c) => t + c.credits, 0);
  // A programme that lists more credits than it requires is offering a
  // selection, not a fixed sequence — the LL.M lists 61 against a
  // 36-credit requirement because students take twelve of the courses.
  const isSelectionBased =
    program.totalCredits != null &&
    courseCredits - program.totalCredits > 0.001;
  const stats = coerceStats(program.feeStructure?.overviewStats);

  return (
    <PageShell
      title={program.programName}
      // Slug-derived this reads "Llb"; the degree code is what the rest
      // of the site calls it.
      breadcrumbLabel={program.degreeCode ? `${program.degreeCode.replace(/\.?$/, '.')}` : program.programName}
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
                  // Round dot bullets rather than icons: a dozen repeated
                  // check marks compete with the prose around them, where
                  // a plain dot just marks the item. `mt-[0.6em]` keeps
                  // the dot on the first line's optical centre when a
                  // role wraps to two lines.
                  <ul className="flex flex-col gap-2.5">
                    {program.careerRoles.map((role) => (
                      <li key={role} className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent"
                        />
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

        {/* ───── Course Structure ─────
            One collapsible panel per semester, matching the reference.
            Counts come from the course rows themselves, so the summary
            line can never disagree with the tables below it. */}
        {semesterGroups.length > 0 && (
          <section className="mb-14 md:mb-20">
            <h2 className="mb-2 text-center font-display text-xl font-bold text-primary md:text-2xl">
              Course Structure
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-[15px] text-gray-600">
              {courses.length} courses {isSelectionBased ? 'offered' : ''} across{' '}
              {semesterGroups.length} semesters. Select a semester to see its
              courses.
            </p>
            <CourseStructure groups={semesterGroups} />
          </section>
        )}

        {/* ───── Credit Distribution ─────
            Per-semester rows with a running cumulative column, then the
            department's published programme totals. */}
        {semesterGroups.length > 0 && (
          <section className="mx-auto mb-14 max-w-6xl md:mb-20">
            <h2 className="mb-6 text-center font-display text-xl font-bold text-primary md:text-2xl">
              Credit Distribution
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[34rem] text-left text-[14px]">
                <caption className="sr-only">
                  Credits per semester with a running cumulative total
                </caption>
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th scope="col" className="px-5 py-3">Semester</th>
                    {/* When a programme offers more than it requires,
                        these columns describe what is on offer, not what
                        one student takes — the headings say so rather
                        than contradicting the note below the table. */}
                    <th scope="col" className="px-5 py-3 text-right">
                      {isSelectionBased ? 'Courses Offered' : 'Courses'}
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      {isSelectionBased ? 'Credits Offered' : 'Credits'}
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let running = 0;
                    return semesterGroups.map((g) => {
                      running += g.credits;
                      return (
                        <tr key={g.slug} className="border-t border-gray-100">
                          <td className="px-5 py-3 font-medium text-gray-800">{g.name}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                            {g.courses.length}
                          </td>
                          <td className="px-5 py-3 text-right font-bold tabular-nums text-primary">
                            {fmtCredits(g.credits)}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums text-gray-700">
                            {fmtCredits(running)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-5 py-3 font-bold text-primary">
                      {isSelectionBased ? 'Total Offered' : 'Total'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-primary">
                      {courses.length}
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-primary" colSpan={2}>
                      {fmtCredits(courseCredits)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Programme-level figures as the department publishes them.
                Shown separately from the per-semester table above so the
                two are never conflated. */}
            {(program.totalCredits != null ||
              program.coreCredits != null ||
              program.projectCredits != null) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Total Credits',   value: program.totalCredits },
                  { label: 'Core Credits',    value: program.coreCredits },
                  { label: 'Project / Thesis', value: program.projectCredits },
                ]
                  .filter((s) => s.value != null)
                  .map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm"
                    >
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {s.label}
                      </div>
                      <div className="font-display text-lg font-bold leading-tight text-primary md:text-xl">
                        {fmtCredits(s.value as number)}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* The department's own note on how to read the list — the
                LL.M offers more courses than its 36 credits require
                because students select twelve of them. Written by the
                department rather than derived from the numbers, so the
                page never puts words in their mouth. */}
            {program.curriculumNote && (
              // A tinted callout with a left accent rule rather than
              // small grey type: this note is what reconciles the
              // "offered" figures above with the credits the programme
              // actually requires, so it has to be read, not skimmed
              // past.
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-5 text-left">
                <Info size={18} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-[14px] leading-relaxed text-gray-700">
                  {program.curriculumNote}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ───── Ready to Apply ─────
            Narrow, centred panel matching the reference: heading, one
            line of copy, then the two buttons stacked on mobile and
            side by side from sm. */}
        <section className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-primary p-8 text-center shadow-2xl md:p-12">
            <h2 className="mb-4 font-display text-2xl font-bold text-white md:text-3xl">
              Ready to Apply?
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-[15px] leading-relaxed text-white/80">
              Take the next step toward your career in {program.programName}.
              Review the admission requirements or explore the tuition fee
              structure.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <CtaLink href="/admission/requirements" primary>
                <ClipboardList size={18} />
                View Requirements
              </CtaLink>
              <CtaLink href="/admission/tuition-fees">
                <CreditCard size={18} />
                Tuition Fees
              </CtaLink>
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 font-bold transition-colors ${
        primary
          ? 'bg-button-yellow text-primary shadow-md hover:bg-button-yellow/90'
          : 'border-2 border-white/30 text-white hover:bg-white/10'
      }`}
    >
      {children}
    </Link>
  );
}
