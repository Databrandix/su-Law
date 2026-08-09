import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Container from '@/components/ui/Container';
import { getResearchPapers, getResearchPapersCount, getPageHero } from '@/lib/identity';

export const metadata = {
  title: 'Research — Department of Law',
  description:
    'Published research papers from the Department of Law, Sonargaon University.',
};

// Papers per page. Matches the news listing so both lists page alike.
const PAGE_SIZE = 20;

type PaperAuthor = { name: string; role: string | null; facultySlug: string | null };

/**
 * Flatten a paper's author columns into one ordered list: the row's own
 * author first, then anyone in `coAuthors`.
 *
 * `coAuthors` is a Json column, so it is validated here rather than
 * trusted — a hand-edited row must not be able to crash the page.
 */
function authorsOf(paper: {
  authors: string;
  authorRole: string | null;
  facultySlug: string | null;
  coAuthors: unknown;
}): PaperAuthor[] {
  const first: PaperAuthor = {
    name: paper.authors,
    role: paper.authorRole,
    facultySlug: paper.facultySlug,
  };

  if (!Array.isArray(paper.coAuthors)) return [first];

  const rest = paper.coAuthors.flatMap((raw): PaperAuthor[] => {
    if (typeof raw !== 'object' || raw === null) return [];
    const o = raw as { name?: unknown; role?: unknown; facultySlug?: unknown };
    if (typeof o.name !== 'string' || o.name.trim() === '') return [];
    return [
      {
        name: o.name,
        role: typeof o.role === 'string' && o.role !== '' ? o.role : null,
        facultySlug:
          typeof o.facultySlug === 'string' && o.facultySlug !== '' ? o.facultySlug : null,
      },
    ];
  });

  return [first, ...rest];
}

type SearchParams = Promise<{ page?: string | string[] }>;

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const pageNum = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const [papers, total, hero] = await Promise.all([
    getResearchPapers({ skip, take: PAGE_SIZE }),
    getResearchPapersCount(),
    getPageHero('research'),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageShell
      title={hero?.heroTitle ?? 'Research Publications'}
      subtitle={hero?.heroSubtitle ?? undefined}
      overline={hero?.heroOverline ?? 'Academic Excellence'}
      image={hero?.heroImageUrl ?? undefined}
      imagePosition={hero ? `center ${hero.heroImageVerticalPercent}%` : undefined}
      contentClassName="bg-gray-50 py-12 md:py-16"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center mb-10 md:mb-14">
          <p className="text-[15px] md:text-[16px] leading-[1.85] text-gray-700">
            A selection of research publications by faculty and students of the
            Department of Law, Sonargaon University, spanning constitutional
            law, human rights and refugee law, criminal justice, corporate and
            commercial law, and more.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-primary bg-primary/5 px-4 py-1.5 rounded-full">
            <FileText size={14} />
            {/* The whole collection, not just this page's slice. */}
            {total} Publications
          </p>
        </div>

        {papers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            {/* An empty page can mean either an empty collection or a
                ?page= past the end — a hand-typed or stale link. */}
            {total === 0 ? (
              <p className="text-gray-500">No research papers yet.</p>
            ) : (
              <>
                <p className="text-gray-500">
                  Page {pageNum} is beyond the last page.
                </p>
                <Link
                  href="/research"
                  className="mt-3 inline-block text-accent hover:underline font-medium text-sm"
                >
                  Back to page 1
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 md:gap-6 lg:grid-cols-2">
              {papers.map((paper, idx) => (
              <article
                key={paper.id}
                className="flex gap-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow p-5 md:p-6"
              >
                <div className="shrink-0">
                  <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center font-display font-bold text-[15px]">
                    {/* Numbering continues across pages — page 2 starts
                        at 21, not back at 1. */}
                    {skip + idx + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] md:text-[16px] font-bold leading-snug text-primary mb-3">
                    {paper.title}
                  </h3>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 mb-3 text-[12.5px]">
                    {paper.date && (
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <Calendar size={13} className="text-accent" />
                        {paper.date}
                      </span>
                    )}
                  </div>

                  {/* Authors — the first author comes from the row's own
                      columns, any co-authors from `coAuthors`. A paper
                      shared by several department members is one entry
                      listing all of them, not one entry each. */}
                  <div className="flex items-start gap-2 mb-2 text-[13px] leading-[1.6]">
                    <Users size={13} className="shrink-0 mt-1 text-accent" />
                    <div className="flex flex-col gap-1.5">
                      {authorsOf(paper).map((a, i) => (
                        <div key={`${a.name}-${i}`} className="flex flex-col">
                          {a.facultySlug ? (
                            <Link
                              href={`/faculty-member/${a.facultySlug}`}
                              className="text-gray-700 font-medium hover:text-accent hover:underline"
                            >
                              {a.name}
                            </Link>
                          ) : (
                            <span className="text-gray-700 font-medium">{a.name}</span>
                          )}
                          {a.role && (
                            <span className="text-[12px] text-gray-500">{a.role}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {paper.publisher && (
                    <div className="flex items-start gap-2 text-[12.5px] leading-[1.6]">
                      <MapPin size={13} className="shrink-0 mt-1 text-gray-400" />
                      <span className="text-gray-500">{paper.publisher}</span>
                    </div>
                  )}

                  {/* Journal metadata pills — each renders only when set,
                      so non-indexed papers stay visually uncluttered. */}
                  {(paper.indexing || paper.quartile || paper.metrics || paper.authorPosition) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {paper.quartile && (
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-[11.5px] font-bold text-accent">
                          {paper.quartile}
                        </span>
                      )}
                      {paper.indexing && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
                          {paper.indexing}
                        </span>
                      )}
                      {paper.metrics && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11.5px] font-medium text-gray-600">
                          {paper.metrics}
                        </span>
                      )}
                      {paper.authorPosition && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11.5px] font-medium text-gray-600">
                          {/* Source values are inconsistent — "1st", "3rd author",
                              "Sole author" — so only append the word when absent. */}
                          {/author/i.test(paper.authorPosition)
                            ? paper.authorPosition
                            : `${paper.authorPosition} author`}
                        </span>
                      )}
                    </div>
                  )}

                  {paper.link && (
                    <div className="mt-4">
                      <a
                        href={paper.link}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="group/link inline-flex items-center gap-1.5 rounded-full border border-primary/20 px-4 py-1.5 text-[12.5px] font-semibold text-primary transition-colors hover:border-accent hover:bg-accent hover:text-white"
                      >
                        <ExternalLink size={13} />
                        {paper.linkLabel || 'View Publication'}
                      </a>
                    </div>
                  )}
                </div>
              </article>
              ))}
            </div>

            {/* Same shape as the news listing's pager, so both lists
                behave identically. Links (not buttons) keep each page
                shareable and crawlable. */}
            {totalPages > 1 && (
              <nav
                aria-label="Research publications pagination"
                className="mt-10 md:mt-14 flex items-center justify-center gap-2"
              >
                {pageNum > 1 ? (
                  <Link
                    href={pageNum === 2 ? '/research' : `/research?page=${pageNum - 1}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-accent hover:text-accent transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 text-sm text-gray-400 cursor-not-allowed">
                    <ChevronLeft size={16} />
                    Previous
                  </span>
                )}
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page <span className="font-semibold text-primary">{pageNum}</span> of{' '}
                  <span className="font-semibold text-primary">{totalPages}</span>
                </span>
                {pageNum < totalPages ? (
                  <Link
                    href={`/research?page=${pageNum + 1}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-accent hover:text-accent transition-colors"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 text-sm text-gray-400 cursor-not-allowed">
                    Next
                    <ChevronRight size={16} />
                  </span>
                )}
              </nav>
            )}
          </div>
        )}
      </Container>
    </PageShell>
  );
}
