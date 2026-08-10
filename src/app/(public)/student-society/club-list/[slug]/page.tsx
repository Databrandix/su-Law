import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, Mail, Network, Phone } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getClubBySlug, getClubDetailSlugs, getClubOptions } from '@/lib/identity';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { DynamicLucideIcon } from '@/components/ui/DynamicLucideIcon';
import JoinClubModalButton from '@/components/forms/JoinClubModalButton';

/**
 * A club's own page — same section rhythm as the Business Club page
 * (intro + stats, activities, closing panel), but driven by the Club
 * row rather than a per-club singleton table, so every one of the
 * clubs on /student-society/club-list can have one.
 *
 * A club with no `introHeading` has no page: it is card-only, which is
 * how the inherited university-wide clubs stay untouched.
 */

type StatsRow = { value: string; label: string };
type ActivityRow = {
  iconName: string;
  imageUrl: string;
  imagePublicId: string | null;
  category: string;
  title: string;
  description: string;
};

function coerceStats(v: unknown): StatsRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      value: typeof r.value === 'string' ? r.value : '',
      label: typeof r.label === 'string' ? r.label : '',
    }))
    .filter((r) => r.value && r.label);
}

function coerceActivities(v: unknown): ActivityRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      iconName:      typeof r.iconName === 'string' ? r.iconName : '',
      imageUrl:      typeof r.imageUrl === 'string' ? r.imageUrl : '',
      imagePublicId: typeof r.imagePublicId === 'string' ? r.imagePublicId : null,
      category:      typeof r.category === 'string' ? r.category : '',
      title:         typeof r.title === 'string' ? r.title : '',
      description:   typeof r.description === 'string' ? r.description : '',
    }))
    .filter((r) => r.title);
}

export async function generateStaticParams() {
  const rows = await getClubDetailSlugs();
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) return { title: 'Club — Department of Law' };
  return {
    title: `${club.name} — Department of Law`,
    // The card description doubles as the meta description; it is a
    // plain summary already.
    description: club.description.slice(0, 300),
  };
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [club, clubOptions] = await Promise.all([
    getClubBySlug(slug),
    getClubOptions(),
  ]);

  // No row, or a row with no detail content, means there is no page —
  // the club exists only as a card on the listing.
  if (!club || !club.introHeading) notFound();

  const stats = coerceStats(club.stats);
  const activities = coerceActivities(club.activities);

  return (
    <PageShell
      title={club.heroTitle ?? club.name}
      overline={club.heroOverline ?? 'Student Society'}
      image={club.heroImageUrl ?? club.imageUrl}
      contentClassName="bg-gray-50 py-12 md:py-20"
    >
      <Container>
        {/* Intro */}
        <section className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-16 md:mb-24">
          <div>
            {club.introOverline && (
              <span className="inline-block text-accent text-[11px] font-bold tracking-[0.3em] uppercase mb-3">
                {club.introOverline}
              </span>
            )}
            <h2
              className="font-display text-3xl md:text-4xl font-bold text-primary leading-tight mb-5"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(club.introHeading) }}
            />
            {club.introBody1 && (
              <p className="text-gray-700 leading-[1.85] mb-6">{club.introBody1}</p>
            )}
            {club.introBody2 && (
              <p className="text-gray-700 leading-[1.85]">{club.introBody2}</p>
            )}

            {stats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-200">
                {stats.map(({ value, label }) => (
                  <div key={label}>
                    <div className="text-2xl md:text-3xl font-display font-bold text-primary">
                      {value}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mt-1">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[360px] md:h-[440px]">
              <Image
                src={club.introImageUrl ?? club.imageUrl}
                alt={`${club.name} members`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 w-24 h-24 bg-button-yellow rounded-2xl -z-10 hidden lg:block" />
            <div className="absolute -top-5 -right-5 w-32 h-32 gradient-blue-magenta rounded-2xl -z-10 hidden lg:block" />
          </div>
        </section>

        {/* Activities */}
        {activities.length > 0 && (
          <section className="mb-16 md:mb-20">
            <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
              {club.activitiesOverline && (
                <span className="inline-block text-accent text-[11px] font-bold tracking-[0.3em] uppercase mb-2">
                  {club.activitiesOverline}
                </span>
              )}
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary leading-tight">
                {club.activitiesHeading ?? 'Activities'}
              </h2>
              <div className="mt-3 mx-auto h-1 w-16 bg-accent rounded-full" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <article
                  key={activity.title}
                  className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                >
                  {activity.imageUrl ? (
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={activity.imageUrl}
                        alt={activity.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                      <div className="absolute top-4 left-4 w-11 h-11 rounded-lg bg-white/95 backdrop-blur flex items-center justify-center shadow-md">
                        <DynamicLucideIcon name={activity.iconName} size={20} className="text-accent" strokeWidth={1.75} />
                      </div>
                      {activity.category && (
                        <span className="absolute bottom-4 left-4 text-[10px] font-bold tracking-[0.2em] uppercase text-white bg-accent/90 px-2.5 py-1 rounded-full">
                          {activity.category}
                        </span>
                      )}
                    </div>
                  ) : (
                    // No photo yet — a gradient band keeps the icon and
                    // category badge visible instead of dropping them
                    // along with the image.
                    <div className="relative flex items-center gap-4 bg-gradient-to-br from-primary to-accent px-6 py-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/95 shadow-md">
                        <DynamicLucideIcon name={activity.iconName} size={20} className="text-accent" strokeWidth={1.75} />
                      </div>
                      {activity.category && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                          {activity.category}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-display text-lg font-bold text-primary leading-snug mb-3">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Closing panel */}
        {club.networkHeading && (
          <section className="relative bg-primary text-white rounded-2xl shadow-2xl">
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            </div>

            <div className="relative grid lg:grid-cols-[1fr_auto] gap-10 items-center p-5 md:p-12 lg:p-14">
              <div>
                {club.networkOverline && (
                  <div className="inline-flex items-center gap-2 mb-3">
                    <Network size={20} className="text-button-yellow" />
                    <span className="text-button-yellow text-[11px] font-bold tracking-[0.3em] uppercase">
                      {club.networkOverline}
                    </span>
                  </div>
                )}
                <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight mb-5">
                  {club.networkHeading}
                </h2>
                <div className="h-1 w-16 bg-button-yellow rounded-full mb-6" />
                {club.networkBody && (
                  <p className="text-white/90 leading-[1.85] text-[15px] md:text-[16px] max-w-2xl">
                    {club.networkBody}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                {/* A "Join …" primary button opens the application
                    popup instead of navigating; any other label keeps
                    the plain-link behaviour so a club can still point
                    its main button at a mailto: or Facebook page. */}
                {club.networkPrimaryCtaLabel && isJoinCta(club.networkPrimaryCtaLabel) ? (
                  <JoinClubModalButton
                    label={club.networkPrimaryCtaLabel}
                    clubs={clubOptions}
                    defaultClubSlug={club.slug}
                  />
                ) : (
                  club.networkPrimaryCtaLabel && club.networkPrimaryCtaHref && (
                    <CtaLink
                      href={club.networkPrimaryCtaHref}
                      label={club.networkPrimaryCtaLabel}
                      variant="primary"
                    />
                  )
                )}
                {club.networkSecondaryCtaLabel && club.networkSecondaryCtaHref && (
                  <CtaLink
                    href={club.networkSecondaryCtaHref}
                    label={club.networkSecondaryCtaLabel}
                    variant="secondary"
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Contact strip — same two-card template as /contact, so the
            society's own phone and e-mail sit above the footer. Each
            card is independent: a club with only an e-mail shows one. */}
        {(club.contactPhone || club.contactEmail) && (
          <section className="mt-14 md:mt-20">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">
                {club.contactHeading ?? 'Quick Contact Information'}
              </h2>
              <div className="mt-3 mx-auto h-1 w-16 bg-accent rounded-full" />
            </div>

            <div className="mx-auto max-w-2xl grid gap-5 sm:grid-cols-2">
              {club.contactPhone && (
                <ContactCard
                  icon={<Phone size={22} className="text-primary" />}
                  title="Phone"
                  value={club.contactPhone}
                  href={`tel:${club.contactPhone.replace(/[^\d+]/g, '')}`}
                  hint={club.contactHours}
                />
              )}
              {club.contactEmail && (
                <ContactCard
                  icon={<Mail size={22} className="text-primary" />}
                  title="E-mail"
                  value={club.contactEmail}
                  href={`mailto:${club.contactEmail}`}
                />
              )}
            </div>
          </section>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/student-society/club-list"
            className="text-sm font-semibold text-primary hover:text-accent transition-colors"
          >
            ← All clubs &amp; societies
          </Link>
        </div>
      </Container>
    </PageShell>
  );
}

/**
 * One card in the contact strip. Same shape as the /contact page's
 * quick-contact cards — circular icon, title, linked value, and an
 * optional hours line under it.
 */
function ContactCard({
  icon,
  title,
  value,
  href,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  href: string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-primary mb-2">{title}</h3>
      <a
        href={href}
        className="text-[14px] font-semibold text-accent hover:text-primary transition-colors break-all"
      >
        {value}
      </a>
      {hint && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-gray-500">
          <Clock size={12} />
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Whether the primary button should open the application popup rather
 * than follow its href. Keyed off the label so an admin controls it
 * from the CMS with no extra field: naming the button "Join the Club"
 * (or anything starting with "Join") turns it into the form trigger,
 * and any other label leaves it a plain link.
 */
function isJoinCta(label: string): boolean {
  return /^\s*join\b/i.test(label);
}

/**
 * CTA that renders as a plain anchor for external links (mailto:,
 * Facebook) and a Next Link for internal routes, so in-app navigation
 * stays client-side.
 */
function CtaLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: 'primary' | 'secondary';
}) {
  const className =
    variant === 'primary'
      ? 'inline-flex items-center justify-center gap-2 px-6 py-3 bg-button-yellow text-primary font-bold rounded-md hover:brightness-105 hover:-translate-y-0.5 transition-all whitespace-nowrap'
      : 'inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-md hover:bg-white hover:text-primary hover:-translate-y-0.5 transition-all whitespace-nowrap';

  const isExternal = /^(https?:|mailto:|tel:)/i.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        {...(href.startsWith('http') && { target: '_blank', rel: 'noopener noreferrer' })}
        className={className}
      >
        {label}
        <ArrowRight size={18} />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
      <ArrowRight size={18} />
    </Link>
  );
}
