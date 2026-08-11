import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getPageHero } from '@/lib/identity';

export const metadata = {
  title: 'Service Charter — Department of Law',
  description:
    'Service charter for the Department of Law, Sonargaon University.',
};

// Placeholder: the nav entry needs a real route to point at, and the
// content is still to come. Deliberately says nothing about what the
// charter contains rather than inventing commitments the department
// has not made.
export default async function ServiceCharterPage() {
  const hero = await getPageHero('student-society-service-charter');

  return (
    <PageShell
      title={hero?.heroTitle ?? 'Service Charter'}
      subtitle={hero?.heroSubtitle ?? undefined}
      overline={hero?.heroOverline ?? 'Student'}
      image={hero?.heroImageUrl ?? '/assets/syllabus-hero.webp'}
      imagePosition={hero ? `center ${hero.heroImageVerticalPercent}%` : undefined}
      contentClassName="bg-gray-50 py-12 md:py-20"
    >
      <Container>
        <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="mb-1 text-base font-semibold text-primary">
            Content coming soon
          </p>
          <p className="text-sm text-gray-500">
            The service charter for the Department of Law will be published
            here shortly.
          </p>
        </div>
      </Container>
    </PageShell>
  );
}
