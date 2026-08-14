'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Search, Download, ExternalLink } from 'lucide-react';

export type SyllabusCardRow = {
  slug: string;
  title: string;
  shortTitle: string;
  department: string;
  level: string;
  pdfUrl: string | null;
  /** Uploaded override; null falls back to page 1 of the PDF. */
  coverUrl: string | null;
  summary: string | null;
};

const FILTERS = ['All', 'Undergraduate', 'Postgraduate'] as const;

/**
 * A plain `download` attribute is ignored cross-origin, so a Cloudinary
 * PDF would open in the tab instead of saving. Asking Cloudinary for the
 * attachment disposition makes the browser save it either way.
 * Non-Cloudinary URLs are returned untouched.
 */
function toDownloadUrl(url: string): string {
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || i === -1) return url;
  const head = url.slice(0, i + marker.length);
  const tail = url.slice(i + marker.length);
  return tail.startsWith('fl_attachment') ? url : `${head}fl_attachment/${tail}`;
}

/**
 * Cover thumbnail derived from the PDF: Cloudinary rasterises page 1 of
 * a stored PDF when asked for `pg_1` with an image extension. Costs no
 * second upload and can never drift out of sync with the document.
 *
 * Returns null for anything that isn't a Cloudinary-hosted PDF; the
 * card then renders without a cover rather than a broken image.
 */
function toDerivedCoverUrl(url: string | null): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1 || !url.toLowerCase().endsWith('.pdf')) return null;
  const head = url.slice(0, i + marker.length);
  const tail = url.slice(i + marker.length).replace(/\.pdf$/i, '.jpg');
  return `${head}pg_1,f_jpg,q_auto/${tail}`;
}

/**
 * An uploaded cover wins over the derived one. That ordering is the
 * point of the column: page 1 is often a bare title sheet, or scans
 * badly, and the department may simply prefer a designed cover.
 * With no upload the derived thumbnail still applies, so existing
 * syllabi look exactly as they did.
 */
function resolveCover(row: SyllabusCardRow): string | null {
  return row.coverUrl || toDerivedCoverUrl(row.pdfUrl);
}

export default function SyllabusClient({ items }: { items: readonly SyllabusCardRow[] }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<(typeof FILTERS)[number]>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (active !== 'All' && s.level !== active) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.level.toLowerCase().includes(q)
      );
    });
  }, [query, active, items]);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center mb-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search syllabi..."
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const isActive = active === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActive(f)}
                className={`px-5 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-accent hover:text-accent'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-8">
        Showing <span className="font-semibold text-primary">{filtered.length}</span>{' '}
        {filtered.length === 1 ? 'syllabus' : 'syllabi'}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          {active === 'Postgraduate' && !query ? (
            <>
              <p className="text-primary font-semibold text-base mb-1">
                Postgraduate syllabus coming soon
              </p>
              <p className="text-gray-500 text-sm">
                Postgraduate programs are not offered yet. Please check back later for updates.
              </p>
            </>
          ) : (
            <p className="text-gray-500">No syllabi match your search.</p>
          )}
        </div>
      ) : (
        <div className={filtered.length === 1 ? 'flex justify-center' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {filtered.map((s) => {
            const cover = resolveCover(s);
            return (
            <article
              key={s.slug}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col ${
                filtered.length === 1 ? 'w-full max-w-md' : ''
              }`}
            >
              {cover && (
                <div className="bg-gray-50">
                  <Image
                    src={cover}
                    alt={
                      s.coverUrl
                        ? `${s.shortTitle} syllabus cover`
                        : `${s.shortTitle} syllabus — first page`
                    }
                    width={600}
                    height={800}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="block w-full h-auto"
                  />
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col">
                <span
                  className={`inline-block w-fit px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-3 ${
                    s.level === 'Undergraduate'
                      ? 'bg-primary/8 text-primary'
                      : 'bg-accent/10 text-accent'
                  }`}
                >
                  {s.level}
                </span>

                <h3 className="font-display text-base md:text-lg font-bold text-primary leading-snug mb-1">
                  {s.shortTitle}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{s.department}</p>
                {s.summary && (
                  <p className="text-sm text-gray-700 leading-relaxed mb-5">{s.summary}</p>
                )}

                {s.pdfUrl ? (
                  // View opens in a new tab so the visitor keeps this
                  // page; Download forces a save.
                  <div className="mt-auto flex flex-col gap-2.5">
                    <a
                      href={s.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-md transition-colors"
                    >
                      <ExternalLink size={16} />
                      View Syllabus
                    </a>
                    <a
                      href={toDownloadUrl(s.pdfUrl)}
                      download
                      className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white text-sm font-semibold rounded-md transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </a>
                  </div>
                ) : (
                  <span className="mt-auto inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-400 text-sm font-semibold rounded-md cursor-not-allowed">
                    PDF not uploaded yet
                  </span>
                )}
              </div>
            </article>
            );
          })}
        </div>
      )}
    </>
  );
}
