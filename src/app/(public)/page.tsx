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
  getAdmissionLeadPopup,
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
// Renders nothing until its dwell timer fires, so it carries no
// skeleton — a placeholder would reserve space for an overlay.
const AdmissionLeadPopup = dynamic(() => import('@/components/forms/AdmissionLeadPopup'));

export default async function HomePage() {
  const [dept, overview, programs, researchAreas, newsTop, eventsTop, noticesTop, leadPopup] = await Promise.all([
    getDepartmentIdentity(),
    getHomeOverview(),
    getProgramsHomeTop(),
    getResearchAreas(),

    getNewsHomeTop(),
    getEventsHomeTop(),
    getNoticesHomeTop(),
    getAdmissionLeadPopup(),
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
      <ProgramsSection programs={programs} />
      <QuickLinksSection />
      <NoticesSection notices={noticesTop} />

      <MajorResearchSection areas={researchAreas} />
      <EventsSection events={eventsTop} />
      <NewsSection news={newsTop} />
      <ServicesSection />
      {/* Timed lead capture. Skipped entirely when the chair has
          switched it off or there is no programme to offer, so the
          client bundle for it is never requested in those cases. */}
      {leadPopup?.isEnabled && leadPopup.programmeOptions.length > 0 && (
        <AdmissionLeadPopup config={leadPopup} />
      )}
    </>
  );
}
