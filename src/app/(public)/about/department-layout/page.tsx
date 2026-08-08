import Image from 'next/image';
import { Download } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getAboutDepartmentLayout } from '@/lib/identity';

export const metadata = {
  title: 'Department Layout — Department of Business Administration',
  description:
    'Layout of the Department of Business Administration, Sonargaon University.',
};

export default async function DepartmentLayoutPage() {
  const row = await getAboutDepartmentLayout();
  if (!row) {
    throw new Error(
      'AboutDepartmentLayout row missing (id="singleton"). Create it from the admin panel.',
    );
  }

  const paragraphs = Array.isArray(row.paragraphs)
    ? (row.paragraphs as unknown[]).filter(
        (p): p is string => typeof p === 'string' && p.trim() !== '',
      )
    : [];

  return (
    <PageShell
      title={row.heroTitle}
      overline={row.heroOverline ?? undefined}
      image={row.heroImageUrl}
      imagePosition={`center ${row.heroImageVerticalPercent}%`}
      contentClassName="bg-gray-50 py-12 md:py-20"
    >
      <Container>
        {paragraphs.length > 0 && (
          <div className="mx-auto mb-10 max-w-3xl space-y-6 text-[16px] leading-[1.85] text-gray-800 md:text-[17px] md:mb-14">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {row.coverUrl ? (
          <div className="flex justify-center">
            <article className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="bg-gray-50">
                <Image
                  src={row.coverUrl}
                  alt={row.cardTitle}
                  width={800}
                  height={1000}
                  sizes="(min-width: 768px) 448px, 100vw"
                  className="block h-auto w-full"
                  priority
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h2 className="mb-4 font-display text-base font-bold leading-snug text-primary md:text-lg">
                  {row.cardTitle}
                </h2>

                {row.pdfUrl ? (
                  // Opens in a new tab rather than downloading in place,
                  // so the visitor keeps the page they came from. `download`
                  // is intentionally absent — it would force a save and
                  // suppress the new tab.
                  <a
                    href={row.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    <Download size={16} />
                    Download
                  </a>
                ) : (
                  <span className="mt-auto inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-400">
                    PDF not uploaded yet
                  </span>
                )}
              </div>
            </article>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center md:p-14">
            <p className="font-display text-lg font-bold text-primary md:text-xl">
              Content coming soon
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
              The department layout is being prepared and will be published
              here shortly.
            </p>
          </div>
        )}
      </Container>
    </PageShell>
  );
}
