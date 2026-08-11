import Image from 'next/image';
import { ArrowRight, Building2, Download, ExternalLink, FileText } from 'lucide-react';
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
 * Groups the directory by floor, preserving the document's office
 * order within each group.
 *
 * Sorting is on the parsed number, not the label: "Level 10" must not
 * sort between "Level 01" and "Level 02" the way a string compare
 * would put it. Any level that carries no number still gets its own
 * card, ordered last — an office is never dropped for having a label
 * this function did not anticipate.
 */
function groupByFloor(offices: OfficeRow[]) {
  const groups = new Map<string, OfficeRow[]>();
  for (const o of offices) {
    const key = o.level || 'Other';
    const bucket = groups.get(key);
    if (bucket) bucket.push(o);
    else groups.set(key, [o]);
  }
  return [...groups.entries()]
    .map(([level, items]) => {
      const digits = level.match(/\d+/);
      return {
        level,
        // The badge shows the floor number the visitor is looking for,
        // so it comes from the label rather than the card's position.
        number: digits ? String(Number(digits[0])) : '–',
        sortKey: digits ? Number(digits[0]) : Number.POSITIVE_INFINITY,
        items,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
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
  const floors = groupByFloor(offices);
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
        <p className="mx-auto mb-4 max-w-3xl text-center text-[15px] leading-[1.85] text-gray-700">
          {paragraphs[0] ??
            'Where to go for what — every office of Sonargaon University serving students of the Department of Law, grouped by the floor you will find it on.'}
        </p>
        {paragraphs.slice(1).map((p, i) => (
          <p
            key={i}
            className="mx-auto mb-4 max-w-3xl text-center text-[15px] leading-[1.85] text-gray-700"
          >
            {p}
          </p>
        ))}

        {/* The building the whole directory refers to. It headed the
            source table; with the table gone it belongs here, stated
            once, rather than repeated on all 22 entries. */}
        {(layout?.deptName || layout?.address) && (
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            {layout.deptName && (
              <p className="text-[15px] font-semibold text-primary">{layout.deptName}</p>
            )}
            {layout.address && (
              <p className="mt-0.5 text-[13.5px] text-gray-500">{layout.address}</p>
            )}
          </div>
        )}

        {/* ───── Office directory, one card per floor ─────
            The reference lays its charter out as numbered cards in a
            grid rather than one long table. The directory has no steps
            to number, so the floor number takes that slot: it is the
            one axis a visitor actually navigates by ("which level do I
            go to?"), and it turns 22 undifferentiated rows into four
            scannable groups. */}
        {floors.length > 0 && (
          <div className="mx-auto grid max-w-[1400px] items-start gap-5 md:gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {floors.map(({ level, number, items }) => (
              <article
                key={level}
                // items-start on the grid, so a floor with one office
                // is a short card rather than a tall one padded with
                // empty space to match its row.
                className="flex h-fit flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg md:p-7"
              >
                <header className="mb-4 flex items-start gap-3">
                  <span className="bg-primary text-white font-display inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold">
                    {number}
                  </span>
                  <h2 className="text-primary mt-1 text-[16px] leading-snug font-bold">
                    {level}
                    <span className="block text-[13px] font-medium text-gray-500">
                      {items.length} {items.length === 1 ? 'office' : 'offices'}
                    </span>
                  </h2>
                </header>

                <ol className="mb-5 flex flex-col gap-3">
                  {items.map((o) => (
                    <li
                      key={o.name}
                      className="flex gap-3 text-[14px] leading-[1.7] text-gray-700"
                    >
                      <ArrowRight
                        size={15}
                        className="text-accent mt-1 shrink-0"
                        aria-hidden="true"
                      />
                      {/* The department's own offices carry the brand
                          colour so they stand out in a long list of
                          university-wide offices. */}
                      <span
                        className={`min-w-0 break-words ${
                          o.highlight ? 'font-semibold text-primary' : ''
                        }`}
                      >
                        {o.name}
                      </span>
                    </li>
                  ))}
                </ol>

                <footer className="flex gap-2.5 border-t border-gray-100 pt-4">
                  <Building2
                    size={15}
                    className="mt-0.5 shrink-0 text-gray-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 text-[13px] leading-[1.65] text-gray-600">
                    <span className="block font-semibold text-gray-800">
                      {level}, Sonargaon University
                    </span>
                    {buildingLine && <span className="block">Building: {buildingLine}</span>}
                  </div>
                </footer>
              </article>
            ))}
          </div>
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
