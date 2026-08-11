import Image from 'next/image';
import { Download, ExternalLink, FileText, MapPin } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getServiceCharter, getAboutDepartmentLayout } from '@/lib/identity';

export const metadata = {
  title: 'Service Charter — Department of Law',
  description:
    'Service charter and office directory for the Department of Law, Sonargaon University.',
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

/**
 * Cover thumbnail rendered from page 1 of the stored PDF, so the
 * preview can never belong to a different document. Returns null for
 * anything that is not a Cloudinary-hosted PDF.
 */
function toCoverUrl(url: string | null): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1 || !url.toLowerCase().endsWith('.pdf')) return null;
  const head = url.slice(0, i + marker.length);
  const tail = url.slice(i + marker.length).replace(/\.pdf$/i, '.jpg');
  return `${head}pg_1,f_jpg,q_auto/${tail}`;
}

/** A plain `download` attribute is ignored cross-origin. */
function toDownloadUrl(url: string): string {
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || i === -1) return url;
  const head = url.slice(0, i + marker.length);
  const tail = url.slice(i + marker.length);
  return tail.startsWith('fl_attachment') ? url : `${head}fl_attachment/${tail}`;
}

export default async function ServiceCharterPage() {
  // The offices come from the department-layout record: its 22 rows
  // were checked one-by-one against the charter document and match on
  // name, level and order, so storing a second copy would only create
  // a way for the two pages to disagree.
  const [row, layout] = await Promise.all([
    getServiceCharter(),
    getAboutDepartmentLayout(),
  ]);

  const paragraphs = Array.isArray(row?.paragraphs)
    ? (row.paragraphs as unknown[]).filter(
        (p): p is string => typeof p === 'string' && p.trim() !== '',
      )
    : [];
  const offices = coerceOffices(layout?.offices);
  const cover = toCoverUrl(row?.pdfUrl ?? null);

  // The building line repeats on every row of the source table, so it
  // is rendered from one value here instead of being stored 22 times.
  const buildingLine = layout?.address?.replace(/-\d+\s*$/, '').trim();

  return (
    <PageShell
      title={row?.heroTitle ?? 'Service Charter'}
      overline={row?.heroOverline ?? 'Student'}
      image={row?.heroImageUrl ?? '/assets/syllabus-hero.webp'}
      imagePosition={row ? `center ${row.heroImageVerticalPercent}%` : undefined}
      contentClassName="bg-gray-50 py-12 md:py-20"
    >
      <Container>
        <p className="mx-auto mb-10 max-w-3xl text-center text-[15px] leading-[1.85] text-gray-700 md:mb-14">
          {paragraphs[0] ??
            'Where to go for what — every office of Sonargaon University serving students of the Department of Law, and the floor you will find it on.'}
        </p>
        {paragraphs.slice(1).map((p, i) => (
          <p
            key={i}
            className="mx-auto mb-6 max-w-3xl text-center text-[15px] leading-[1.85] text-gray-700"
          >
            {p}
          </p>
        ))}

        {/* ───── Office directory ───── */}
        {offices.length > 0 && (
          <section className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <header className="border-b border-gray-200 px-6 py-6 text-center">
                <h2 className="font-display text-xl font-bold text-primary md:text-2xl">
                  Sonargaon University
                </h2>
                {layout?.deptName && (
                  <p className="mt-1 text-[15px] text-gray-700">{layout.deptName}</p>
                )}
                {layout?.address && (
                  <p className="mt-0.5 text-[13.5px] text-gray-500">{layout.address}</p>
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
                    <tr className="border-b border-gray-200 bg-gray-50 text-[13px] font-bold text-gray-700">
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
                      <tr key={o.name} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-5 py-3.5 align-top">
                          {/* The department's own offices carry the brand
                              colour so they stand out in a long list of
                              university-wide offices. */}
                          <span
                            className={
                              o.highlight ? 'font-semibold text-primary' : 'text-gray-800'
                            }
                          >
                            {o.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 align-top text-gray-700">
                          <span className="flex items-start gap-2">
                            <MapPin
                              size={15}
                              className="mt-[3px] shrink-0 text-accent"
                              aria-hidden="true"
                            />
                            <span>
                              <span className="block">{o.level}, Sonargaon University</span>
                              {buildingLine && (
                                <span className="block text-[13.5px] text-gray-500">
                                  Building: {buildingLine}
                                </span>
                              )}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ───── Downloadable charter ───── */}
        <div className="mt-14 md:mt-20">
          <h2 className="mb-2 text-center font-display text-xl font-bold text-primary md:text-2xl">
            Download the charter
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-[15px] text-gray-600">
            The same directory as a printable document.
          </p>

          <div className="flex justify-center">
            <article className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
              {cover && (
                <div className="bg-gray-50">
                  <Image
                    src={cover}
                    alt={`${row?.cardTitle ?? 'Service Charter'} — first page`}
                    width={600}
                    height={800}
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="block h-auto w-full"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-1 font-display text-base font-bold leading-snug text-primary md:text-lg">
                  {row?.cardTitle ?? 'Service Charter'}
                </h3>

                <div className="mt-4 flex flex-col gap-2.5">
                  {row?.pdfUrl ? (
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
                        View Charter
                      </a>
                      <a
                        href={toDownloadUrl(row.pdfUrl)}
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
