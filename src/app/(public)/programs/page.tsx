import PageShell from '@/components/layout/PageShell';
import ProgramsSection from '@/components/sections/ProgramsSection';
import { getProgramsWithCta, getPageHero } from '@/lib/identity';

export const metadata = {
  title: 'Programs — Department of Business Administration',
  description:
    'Undergraduate and graduate programs offered by the Department of Business Administration, Sonargaon University — BBA, MBA, EMBA, MBM, and specialised master’s degrees.',
};

export default async function ProgramsIndexPage() {
  const [programs, hero] = await Promise.all([
    getProgramsWithCta(),
    getPageHero('programs'),
  ]);

  return (
    <PageShell
      title={hero?.heroTitle ?? 'Programs'}
      subtitle={hero?.heroSubtitle ?? undefined}
      overline={hero?.heroOverline ?? 'Academic Programs'}
      image={hero?.heroImageUrl ?? undefined}
      imagePosition={hero ? `center ${hero.heroImageVerticalPercent}%` : undefined}
      // ProgramsSection brings its own background and vertical padding,
      // so the shell contributes neither.
      contentClassName=""
    >
      {/* showAllLink stays off — this page already is the full list;
          showHeading too, since the hero above already titles it. */}
      <ProgramsSection programs={programs} showHeading={false} />
    </PageShell>
  );
}
