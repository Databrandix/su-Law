import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getClubs, getPageHero } from '@/lib/identity';

export const metadata = {
  title: 'Club List',
  description:
    'Student clubs and societies at Sonargaon University — cultural, technical, sports, and service clubs that enrich campus life.',
};

export default async function ClubListPage() {
  const [clubs, hero] = await Promise.all([
    getClubs(),
    getPageHero('student-society-club-list'),
  ]);

  return (
    <PageShell
      title={hero?.heroTitle ?? 'Student Clubs'}
      subtitle={hero?.heroSubtitle ?? undefined}
      overline={hero?.heroOverline ?? 'Student Society'}
      image={hero?.heroImageUrl ?? '/assets/club-list-hero.webp'}
      imagePosition={hero ? `center ${hero.heroImageVerticalPercent}%` : undefined}
      contentClassName="bg-gray-50 py-12 md:py-16"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center mb-10 md:mb-14">
          <p className="text-[15px] md:text-[16px] leading-[1.85] text-gray-700">
            Sonargaon University hosts a vibrant network of student clubs that
            shape campus life beyond the classroom — from the Department of
            Law&rsquo;s own moot court and advocacy societies to performing
            arts, sports, and social service.
          </p>
        </div>

        {clubs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No clubs yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <article
                key={club.id}
                // Anchor target, so nav entries and shared links can
                // point at one club: /student-society/club-list#law-club
                id={club.slug}
                // The sticky header would otherwise cover a jumped-to
                // card; this offsets the scroll position by its height.
                className="scroll-mt-28 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                  <Image
                    src={club.imageUrl}
                    alt={club.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>

                <div className="p-5 md:p-6 flex flex-col gap-3 flex-1">
                  <div className="flex items-start gap-2">
                    <Users size={18} className="shrink-0 mt-1 text-accent" />
                    <div className="flex-1">
                      <h3 className="text-[16px] md:text-[17px] font-bold text-primary leading-snug">
                        {club.name}
                      </h3>
                      <span className="inline-block mt-1 rounded-md bg-primary/5 px-2 py-0.5 text-[11px] font-bold tracking-wider text-primary">
                        {club.abbreviation}
                      </span>
                    </div>
                  </div>

                  <p className="text-[14px] leading-[1.7] text-gray-700 mt-1">
                    {club.description}
                  </p>

                  {/* Only clubs with detail content have a page; the
                      rest stay card-only and show no link. */}
                  {club.introHeading && (
                    <Link
                      href={`/student-society/club-list/${club.slug}`}
                      className="group/link mt-auto inline-flex items-center gap-1.5 pt-2 text-[13px] font-semibold text-primary transition-colors hover:text-accent"
                    >
                      Learn more
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover/link:translate-x-0.5"
                      />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </PageShell>
  );
}
