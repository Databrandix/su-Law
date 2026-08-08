import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getProgramFeeStructures, getPrograms, getPageHero } from '@/lib/identity';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { DynamicLucideIcon } from '@/components/ui/DynamicLucideIcon';
import ProgramTabs from './ProgramTabs';

export const metadata = {
  title: 'Tuition Fees — Department of Business Administration',
  description:
    'Tuition fee structures by program at Sonargaon University Department of Business Administration.',
};

// Phase 20 — overview / shifts / policies all use DynamicLucideIcon
// against the full Lucide library; silent HelpCircle fallback on
// unknown names.

// ─── Json column shapes (defensive coerce) ───────────────────────

type OverviewStat = { iconName: string; label: string; value: string };
// waiver / credits are optional: rows seeded before they existed still
// render, just without those two cells.
type FeeTier = {
  gpa: string;
  waiver?: string;
  credits?: number;
  perCredit: number;
  total: number;
};
type FeeGroup = { background: string; tiers: FeeTier[] };
type FeeShift = {
  iconName: string;
  name: string;
  shiftLabel: string;
  description: string;
  groups: FeeGroup[];
};
type FeePolicy = { iconName: string; title: string; text: string };

function coerceOverview(v: unknown): OverviewStat[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      iconName: typeof r.iconName === 'string' ? r.iconName : '',
      label:    typeof r.label    === 'string' ? r.label    : '',
      value:    typeof r.value    === 'string' ? r.value    : '',
    }))
    .filter((s) => s.label && s.value);
}

function coerceTiers(v: unknown): FeeTier[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      gpa:       typeof r.gpa       === 'string' ? r.gpa       : '',
      waiver:    typeof r.waiver    === 'string' ? r.waiver    : undefined,
      credits:   typeof r.credits   === 'number' ? r.credits   : undefined,
      perCredit: typeof r.perCredit === 'number' ? r.perCredit : 0,
      total:     typeof r.total     === 'number' ? r.total     : 0,
    }))
    .filter((t) => t.gpa);
}

function coerceGroups(v: unknown): FeeGroup[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      background: typeof r.background === 'string' ? r.background : '',
      tiers:      coerceTiers(r.tiers),
    }))
    .filter((g) => g.background);
}

function coerceShifts(v: unknown): FeeShift[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      iconName:    typeof r.iconName    === 'string' ? r.iconName    : '',
      name:        typeof r.name        === 'string' ? r.name        : '',
      shiftLabel:  typeof r.shiftLabel  === 'string' ? r.shiftLabel  : '',
      description: typeof r.description === 'string' ? r.description : '',
      groups:      coerceGroups(r.groups),
    }))
    .filter((s) => s.name);
}

function coercePolicies(v: unknown): FeePolicy[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      iconName: typeof r.iconName === 'string' ? r.iconName : '',
      title:    typeof r.title    === 'string' ? r.title    : '',
      text:     typeof r.text     === 'string' ? r.text     : '',
    }))
    .filter((p) => p.title && p.text);
}

const fmt = (n: number) => 'BDT ' + n.toLocaleString('en-BD');

// The row shape getProgramFeeStructures returns — derived rather than
// hand-written so a schema change surfaces here as a type error.
type FeeStructureRow = Awaited<ReturnType<typeof getProgramFeeStructures>>[number];

// One program's fee content: intro, overview stats, shift tables and
// policies. Lifted out of the page body so ProgramTabs can receive it
// as a panel and show one program at a time.
function FeeStructureBlock({ fs }: { fs: FeeStructureRow }) {
  const overview = coerceOverview(fs.overviewStats);
  const shifts   = coerceShifts(fs.shifts);
  const policies = coercePolicies(fs.policies);

  return (
              <div>
                {/* Intro */}
                <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
                  {/* Optional — a blank overline should collapse rather
                      than leave its bottom margin behind. */}
                  {fs.introOverline && (
                    <span className="inline-block text-accent text-[11px] font-bold tracking-[0.3em] uppercase mb-2">
                      {fs.introOverline}
                    </span>
                  )}
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-primary leading-tight mb-4">
                    {fs.introHeading}
                  </h2>
                  <p className="text-base text-gray-700 leading-[1.85]">
                    {fs.introBody}
                  </p>
                </div>

                {/* Program Overview */}
                {overview.length > 0 && (
                  <section className="mb-16 md:mb-20">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {overview.map((stat) => {
                        return (
                          <div
                            key={`${stat.label}-${stat.value}`}
                            className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow text-center"
                          >
                            <div className="inline-flex w-11 h-11 rounded-lg bg-gradient-to-br from-primary to-accent text-white items-center justify-center mb-3 shadow-md">
                              <DynamicLucideIcon name={stat.iconName} size={20} strokeWidth={1.75} />
                            </div>
                            <div className="text-[10px] font-bold tracking-wider uppercase text-gray-500 mb-1">
                              {stat.label}
                            </div>
                            <div className="font-display text-lg md:text-xl font-bold text-primary leading-tight">
                              {stat.value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Shifts */}
                {shifts.length > 0 && (
                  <section className="mb-16 md:mb-20">
                    <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
                      <span className="inline-block text-accent text-[11px] font-bold tracking-[0.3em] uppercase mb-2">
                        By Admission Shift
                      </span>
                      <h2 className="font-display text-3xl md:text-4xl font-bold text-primary leading-tight">
                        Choose Your Shift
                      </h2>
                      <div className="mt-3 mx-auto h-1 w-16 bg-accent rounded-full" />
                    </div>

                    <div className="space-y-8">
                      {shifts.map((shift) => {
                        return (
                          <article
                            key={shift.name}
                            className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
                          >
                            {/* Shift header */}
                            <div className="bg-gradient-to-r from-primary to-accent text-white px-6 md:px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                                  <DynamicLucideIcon name={shift.iconName} size={22} className="text-button-yellow" strokeWidth={1.75} />
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-button-yellow">
                                    {shift.shiftLabel}
                                  </div>
                                  <h3 className="font-display text-xl md:text-2xl font-bold leading-tight">
                                    {shift.name}
                                  </h3>
                                </div>
                              </div>
                              {shift.description && (
                                <p className="text-white/85 text-sm mt-3">{shift.description}</p>
                              )}
                            </div>

                            {/* Fee tables */}
                            <div className="p-6 md:p-8 space-y-8">
                              {shift.groups.map((group) => {
                                // Undergraduate groups name an entry
                                // background ("SSC + HSC"); master's
                                // groups name the table itself, so only
                                // the former take the "Background" suffix.
                                const isBackground =
                                  !/fee|structure|rate/i.test(group.background);
                                // GPA tiers are an undergraduate concept;
                                // master's rows are named fee categories.
                                const firstColumnLabel = isBackground
                                  ? 'GPA Range'
                                  : 'Category';
                                return (
                                <div key={group.background}>
                                  <h4 className="text-[11px] font-bold tracking-[0.25em] uppercase text-accent mb-3">
                                    {group.background}
                                    {isBackground ? ' Background' : ''}
                                  </h4>
                                  <div className="overflow-x-auto -mx-2">
                                    <table className="w-full min-w-[620px] border-collapse">
                                      <thead>
                                        <tr className="border-b-2 border-primary/15 text-left">
                                          <th className="px-3 py-3 text-[11px] font-bold tracking-wider uppercase text-gray-500">
                                            {firstColumnLabel}
                                          </th>
                                          <th className="px-3 py-3 text-[11px] font-bold tracking-wider uppercase text-gray-500 text-center">
                                            Waiver
                                          </th>
                                          <th className="px-3 py-3 text-[11px] font-bold tracking-wider uppercase text-gray-500 text-center">
                                            Credits
                                          </th>
                                          <th className="px-3 py-3 text-[11px] font-bold tracking-wider uppercase text-gray-500 text-right">
                                            Per Credit
                                          </th>
                                          <th className="px-3 py-3 text-[11px] font-bold tracking-wider uppercase text-gray-500 text-right">
                                            Total Program Cost
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.tiers.map((tier) => (
                                          <tr
                                            key={tier.gpa}
                                            className="border-b border-gray-100 hover:bg-accent/5 transition-colors"
                                          >
                                            <td className="px-3 py-4">
                                              <span className="inline-block px-3 py-1 bg-primary/8 text-primary text-sm font-semibold rounded">
                                                {tier.gpa}
                                              </span>
                                            </td>
                                            <td className="px-3 py-4 text-center font-display font-bold text-accent">
                                              {tier.waiver ?? '—'}
                                            </td>
                                            <td className="px-3 py-4 text-center font-display font-bold text-gray-800">
                                              {tier.credits ?? '—'}
                                            </td>
                                            <td className="px-3 py-4 text-right font-display font-bold text-gray-800">
                                              {fmt(tier.perCredit)}
                                            </td>
                                            <td className="px-3 py-4 text-right font-display font-bold text-accent">
                                              {/* A zero total means the row
                                                  quotes a rate, not a cost —
                                                  the base per-credit price
                                                  before any waiver. */}
                                              {tier.total > 0 ? fmt(tier.total) : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Important Policies */}
                {policies.length > 0 && (
                  <section>
                    <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
                      <span className="inline-block text-accent text-[11px] font-bold tracking-[0.3em] uppercase mb-2">
                        Read Before You Apply
                      </span>
                      <h2 className="font-display text-3xl md:text-4xl font-bold text-primary leading-tight">
                        Important Policies
                      </h2>
                      <div className="mt-3 mx-auto h-1 w-16 bg-accent rounded-full" />
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      {policies.map((policy) => {
                        return (
                          <article
                            key={policy.title}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6"
                          >
                            <div className="inline-flex w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent text-white items-center justify-center mb-4 shadow-md">
                              <DynamicLucideIcon name={policy.iconName} size={22} strokeWidth={1.75} />
                            </div>
                            <h3 className="font-display text-lg font-bold text-primary mb-2">{policy.title}</h3>
                            <p className="text-sm text-gray-700 leading-relaxed"
                               dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy.text) }} />
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
  );
}
export default async function TuitionFeesPage() {
  const [feeStructures, programs, hero] = await Promise.all([
    getProgramFeeStructures(),
    getPrograms(),
    getPageHero('admission-tuition-fees'),
  ]);

  return (
    <PageShell
      title={hero?.heroTitle ?? 'Tuition Fees'}
      subtitle={hero?.heroSubtitle ?? undefined}
      overline={hero?.heroOverline ?? 'Admission'}
      image={hero?.heroImageUrl ?? '/assets/admission-hero.webp'}
      imagePosition={hero ? `center ${hero.heroImageVerticalPercent}%` : 'top'}
      contentClassName="bg-gray-50 py-12 md:py-20"
    >
      <Container>
        <ProgramTabs
          programs={programs.map((p) => {
            const fs = feeStructures.find((f) => f.program.id === p.id);
            return {
              id: p.id,
              code: p.degreeCode,
              name: p.programName,
              tier: p.overline,
              panel: fs ? <FeeStructureBlock fs={fs} /> : undefined,
            };
          })}
        />
      </Container>
    </PageShell>
  );
}
