import { notFound } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getSyllabi, getPageHero, isNavPathDisabled } from '@/lib/identity';
import SyllabusClient from './SyllabusClient';

const NAV_HREF = '/student-society/syllabus';

// This page's availability is a DB flag that can flip at any moment, so
// it opts out of the (public) layout's `revalidate = 3600`. Two reasons:
// a statically cached copy would keep serving for up to an hour after
// the page is switched back on, and notFound() rendered into the ISR
// cache is replayed as a 200 — telling crawlers a disabled page is fine.
// Dynamic rendering makes the toggle immediate and the 404 honest.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Syllabus — Department of Law',
  description:
    'Course-by-course syllabus for the Department of Law, Sonargaon University.',
};

export default async function SyllabusPage() {
  // Taking the page offline is a content decision, so it is driven by
  // the "Disabled" checkbox on this page's /admin/nav entry rather than
  // by a code edit — the same flag that greys the menu item out. Untick
  // it there and the page returns; nothing here needs changing.
  if (await isNavPathDisabled(NAV_HREF)) notFound();

  const [items, hero] = await Promise.all([
    getSyllabi(),
    getPageHero('student-society-syllabus'),
  ]);

  return (
    <PageShell
      title={hero?.heroTitle ?? 'Syllabus'}
      subtitle={hero?.heroSubtitle ?? undefined}
      overline={hero?.heroOverline ?? 'Student'}
      image={hero?.heroImageUrl ?? '/assets/syllabus-hero.webp'}
      imagePosition={hero ? `center ${hero.heroImageVerticalPercent}%` : undefined}
      contentClassName="bg-gray-50 py-12 md:py-20"
    >
      <Container>
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <p className="text-base md:text-lg text-gray-700 leading-[1.85]">
            Course-by-course syllabus for the Department of Law. Download the official PDF for detailed credit distribution, course outcomes, and reference materials.
          </p>
        </div>

        <SyllabusClient
          items={items.map((s) => ({
            slug:       s.slug,
            title:      s.title,
            // Short title is optional — the card heading uses the full
            // title when it isn't set.
            shortTitle: s.shortTitle ?? s.title,
            department: s.department,
            level:      s.level,
            pdfUrl:     s.pdfUrl,
            // Null here means "derive the thumbnail from the PDF".
            coverUrl:   s.coverUrl,
            summary:    s.summary,
          }))}
        />
      </Container>
    </PageShell>
  );
}
