import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import LegalSections from '@/components/sections/LegalSections';
import { getLegalPagesContent } from '@/lib/identity';

export const metadata = {
  title: 'Terms & Conditions — Sonargaon University',
  description:
    'Terms & Conditions for the Department of Business Administration, Sonargaon University — site usage, consent, log files, and how we use your information.',
};

export default async function TermsAndConditionsPage() {
  const row = await getLegalPagesContent();
  if (!row) {
    throw new Error(
      'LegalPagesContent row missing (id="singleton"). Create it from the admin panel.',
    );
  }

  return (
    <PageShell
      title={row.termsHeroTitle}
      overline={row.termsHeroOverline ?? undefined}
      image={row.termsHeroImageUrl}
      imagePosition={`center ${row.termsHeroImageVerticalPercent}%`}
      contentClassName="bg-gray-50 py-12 md:py-16"
    >
      <Container>
        <LegalSections sections={row.termsSections} />
      </Container>
    </PageShell>
  );
}
