import dynamic from 'next/dynamic';
import HeroSection from '@/components/sections/HeroSection';
import {
  getDepartmentIdentity,
  getHomeOverview,
  getProgramsHomeTop,
  getResearchAreas,

  getNewsHomeTop,
  getEventsHomeTop,
  getNoticesHomeTop,
} from '@/lib/identity';
import { sanitizeHtml } from '@/lib/sanitize-html';

function sectionSkeleton(minHeight: string) {
  return function Skeleton() {
    return <div className={`${minHeight} bg-white`} aria-hidden="true" />;
  };
}

const OverviewSection = dynamic(() => import('@/components/sections/OverviewSection'), {
  loading: sectionSkeleton('min-h-[500px]'),
});
const ProgramsSection = dynamic(() => import('@/components/sections/ProgramsSection'), {
  loading: sectionSkeleton('min-h-[500px]'),
});
const QuickLinksSection = dynamic(() => import('@/components/sections/QuickLinksSection'), {
  loading: sectionSkeleton('min-h-[300px]'),
});
const NoticesSection = dynamic(() => import('@/components/sections/NoticesSection'), {
  loading: sectionSkeleton('min-h-[400px]'),
});
const MajorResearchSection = dynamic(() => import('@/components/sections/MajorResearchSection'), {
  loading: sectionSkeleton('min-h-[500px]'),
});
const EventsSection = dynamic(() => import('@/components/sections/EventsSection'), {
  loading: sectionSkeleton('min-h-[500px]'),
});
const NewsSection = dynamic(() => import('@/components/sections/NewsSection'), {
  loading: sectionSkeleton('min-h-[500px]'),
});
const ServicesSection = dynamic(() => import('@/components/sections/ServicesSection'), {
  loading: sectionSkeleton('min-h-[400px]'),
});

export default async function HomePage() {
  const [dept, overview, programs, researchAreas, newsTop, eventsTop, noticesTop] = await Promise.all([
    getDepartmentIdentity(),
    getHomeOverview(),
    getProgramsHomeTop(),
    getResearchAreas(),

    getNewsHomeTop(),
    getEventsHomeTop(),
    getNoticesHomeTop(),
  ]);
  return (
    <>
      <HeroSection
        imageUrls={[dept.heroImage1Url, dept.heroImage2Url, dept.heroImage3Url]}
        imageAlts={[dept.heroImage1Alt, dept.heroImage2Alt, dept.heroImage3Alt]}
        imageVerticalPercents={[
          dept.heroImage1VerticalPercent,
          dept.heroImage2VerticalPercent,
          dept.heroImage3VerticalPercent,
        ]}
        breadcrumbLabel={dept.breadcrumbLabel}
        programName={dept.programName || dept.name}
        programShortForm={dept.programShortForm}
        programSubtitle={dept.programSubtitle}
      />
      {/* Row is seeded by migration; the section is simply skipped if
          an operator ever deletes it rather than crashing the page. */}
      {overview && (
        <OverviewSection
          heading={overview.heading}
          bodyHtml={sanitizeHtml(overview.body)}
          imageUrl={overview.imageUrl}
          imageAlt={overview.imageAlt}
          primaryCta={{
            label: overview.primaryCtaLabel,
            href: overview.primaryCtaHref,
            isExternal: overview.primaryCtaExternal,
          }}
          secondaryCta={{
            label: overview.secondaryCtaLabel,
            href: overview.secondaryCtaHref,
            isExternal: overview.secondaryCtaExternal,
          }}
        />
      )}
      <ProgramsSection programs={programs} showAllLink />
      <QuickLinksSection />
      <NoticesSection notices={noticesTop} />

      <MajorResearchSection areas={researchAreas} />
      <EventsSection events={eventsTop} />
      <NewsSection news={newsTop} />
      <ServicesSection />
    </>
  );
}
