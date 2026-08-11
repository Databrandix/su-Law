import Image from 'next/image';
import { Download, ExternalLink, FileText, ImageIcon } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getAboutDepartmentLayout } from '@/lib/identity';

export const metadata = {
  title: 'Department Layout — Department of Law',
  description:
    'Office directory and layout plan for the Department of Law, Sonargaon University.',
};

type OfficeRow = { name: string; level: string; highlight: boolean };

// `offices` is a Json column — narrow it to the shape the table needs
// rather than trusting the column at render time.
function coerceOffices(v: unknown): OfficeRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      name: typeof r.name === 'string' ? r.name : '',
      level: typeof r.level === 'string' ? r.level : '',
      highlight: r.highlight === true,
    }))
    .filter((r) => r.name);
}

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
  const offices = coerceOffices(row.offices);

  // The building line repeats on every row of the source table, so it
  // is rendered from one value here instead of being stored 22 times.
  const buildingLine = row.address?.replace(/-\d+\s*$/, '').trim();

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
          <div className="mx-auto mb-10 max-w-3xl space-y-6 text-[16px] leading-[1.85] text-gray-800 md:mb-14 md:text-[17px]">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {/* ───── Office directory ───── */}
        {offices.length > 0 && (
          <section className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
              <header className="border-b border-gray-300 px-6 py-6 text-center">
                <h2 className="font-display text-xl font-bold text-primary md:text-2xl">
                  Sonargaon University
                </h2>
                {row.deptName && (
                  <p className="mt-1 text-[15px] text-gray-700">{row.deptName}</p>
                )}
                {row.address && (
                  <p className="mt-0.5 text-[13.5px] text-gray-500">{row.address}</p>
                )}
              </header>

              {/* Horizontal scroll rather than a squeezed table on
                  narrow screens — min-w keeps both columns legible. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left align-top text-[15px]">
                  <caption className="sr-only">
                    Each office of Sonargaon University and the level it is on
                  </caption>
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50 text-[13px] font-bold text-gray-700">
                      <th scope="col" className="w-[45%] px-5 py-3">
                        Name of the Office
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Specific Location of the Office
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {offices.map((o) => (
                      <tr key={o.name} className="border-b border-gray-200 last:border-b-0">
                        <td className="px-5 py-3.5 align-top">
                          {/* The department's own offices carry the brand
                              colour so they stand out in a long list of
                              university-wide offices. */}
                          <span
                            className={
                              o.highlight
                                ? 'font-semibold text-primary'
                                : 'text-gray-800'
                            }
                          >
                            {o.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 align-top text-gray-700">
                          <span className="block">{o.level}, Sonargaon University</span>
                          {buildingLine && (
                            <span className="block text-[13.5px] text-gray-500">
                              Building: {buildingLine}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ───── Downloadable plan ─────
            Cover and PDF are uploaded separately, so each has its own
            placeholder: the card always renders, and each slot fills in
            independently as the files arrive. */}
        <div className="mt-14 md:mt-20">
          <h2 className="mb-2 text-center font-display text-xl font-bold text-primary md:text-2xl">
            Download the plan
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-[15px] text-gray-600">
            The same directory as a printable document.
          </p>

          <div className="flex justify-center">
            <article className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
              {row.coverUrl ? (
                <div className="bg-gray-50">
                  <Image
                    src={row.coverUrl}
                    alt={`${row.deptName ?? 'Department'} — ${row.cardTitle}`}
                    width={600}
                    height={800}
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="block h-auto w-full"
                  />
                </div>
              ) : (
                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 border-b border-dashed border-gray-200 bg-gray-50 text-gray-400">
                  <ImageIcon size={32} strokeWidth={1.5} />
                  <span className="text-[13px] font-medium">Cover image coming soon</span>
                </div>
              )}

              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-1 font-display text-base font-bold leading-snug text-primary md:text-lg">
                  {row.cardTitle}
                </h3>

                <div className="mt-4 flex flex-col gap-2.5">
                  {row.pdfUrl ? (
                    <>
                      {/* View opens in a new tab so the visitor keeps
                          this page; Download forces a save. */}
                      <a
                        href={row.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                      >
                        <ExternalLink size={16} />
                        View Layout
                      </a>
                      <a
                        href={row.pdfUrl}
                        download={row.pdfFileName ?? undefined}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-primary bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                      >
                        <Download size={16} />
                        Download
                      </a>
                    </>
                  ) : (
                    <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-400">
                      <FileText size={16} />
                      PDF coming soon
                    </span>
                  )}
                </div>
              </div>
            </article>
          </div>
        </div>
      </Container>
    </PageShell>
  );
}
