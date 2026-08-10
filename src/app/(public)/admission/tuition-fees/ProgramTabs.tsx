'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';

export type ProgramTab = {
  /** Stable key — the Program row id. */
  id: string;
  /** Short code shown on the pill (LLB, LLM…). */
  code: string;
  /** Full name, shown under the tab strip once selected. */
  name: string;
  /** "Undergraduate" / "Graduate" — groups the pills. */
  tier: string;
  /** The fee tables for this program, rendered on the server. */
  panel?: ReactNode;
};

/** URL key holding the selected programme, e.g. ?program=LLM */
const PARAM = 'program';

/** Compare codes case- and punctuation-insensitively ("LL.M" ~ "llm"). */
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Program selector for the tuition-fee tables.
 *
 * Every panel is server-rendered and stays in the document — only its
 * visibility is toggled. That keeps all eight fee tables crawlable and
 * findable with Ctrl+F while showing one at a time.
 *
 * The selection lives in the URL (?program=LLM) rather than in local
 * state, so a refresh, a bookmark, or a shared link keeps the programme
 * the reader was looking at instead of snapping back to the first tab.
 */
export default function ProgramTabs({
  programs,
}: {
  programs: readonly ProgramTab[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (programs.length === 0) return null;

  const requested = searchParams.get(PARAM);
  const active =
    (requested
      ? programs.find((p) => normalize(p.code) === normalize(requested))
      : undefined) ?? programs[0];

  function select(program: ProgramTab) {
    const next = new URLSearchParams(searchParams.toString());
    // The first programme is the default, so it needs no query string.
    if (program.id === programs[0].id) next.delete(PARAM);
    else next.set(PARAM, program.code);

    const qs = next.toString();
    // scroll: false keeps the reader where they are — the tab strip is
    // usually already off the top of the viewport when they switch.
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }

  return (
    <>
      {/* Negative top margin pulls the strip up out of the page shell's
          content padding, so it sits closer to the hero. */}
      <div className="-mt-6 md:-mt-10 mb-10 md:mb-14">
        <div
          className="flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Programs"
        >
          {programs.map((p, i) => {
            const isActive = p.id === active.id;
            // A slightly wider gap marks where one tier ends and the next
            // begins, keeping the grouping legible on a single row.
            const startsNewTier = i > 0 && programs[i - 1].tier !== p.tier;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`tab-${p.id}`}
                aria-controls={`panel-${p.id}`}
                aria-selected={isActive}
                title={`${p.tier} — ${p.name}`}
                onClick={() => select(p)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                  startsNewTier ? 'ml-3 md:ml-5' : ''
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-accent hover:text-accent'
                }`}
              >
                {p.code}
              </button>
            );
          })}
        </div>

        {/* Full name + tier of the selection — the pills carry codes only. */}
        <p className="mt-5 text-center">
          <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            {active.tier}
          </span>
          <span className="mt-1 block font-display text-lg md:text-xl font-bold text-primary">
            {active.name}
          </span>
        </p>
      </div>

      {programs.map((p) => (
        <div
          key={p.id}
          id={`panel-${p.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${p.id}`}
          hidden={p.id !== active.id}
        >
          {p.panel ?? (
            <>
              {/* The heading and explanation normally come from the fee
                  row's own intro fields. A program with no row yet still
                  needs them — otherwise the tab shows nothing but a
                  "not published" box with no context for what is
                  missing or how the fees will be structured. */}
              <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
                <h2 className="mb-4 font-display text-2xl font-bold leading-tight text-primary md:text-3xl">
                  Tuition Fee Structure
                </h2>
                <p className="text-base leading-[1.85] text-gray-700">
                  Cost per credit and the total program cost vary with your
                  academic background and the shift you choose. Waivers are
                  applied on the standard per-credit rate.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <p className="mb-1 text-base font-semibold text-primary">
                  Fee structure not yet published
                </p>
                <p className="text-sm text-gray-500">
                  Please check back later for the fee table for this program.
                </p>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  );
}
