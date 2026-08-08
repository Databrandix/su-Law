'use client';

import { useState, type ReactNode } from 'react';

export type ProgramTab = {
  /** Stable key — the Program row id. */
  id: string;
  /** Short code shown on the pill (BBA, EMBA, MBM…). */
  code: string;
  /** Full name, shown under the tab strip once selected. */
  name: string;
  /** "Undergraduate" / "Graduate" — groups the pills. */
  tier: string;
  /** The fee tables for this program, rendered on the server. */
  panel?: ReactNode;
};

/**
 * Program selector for the tuition-fee tables.
 *
 * Every panel is server-rendered and stays in the document — only its
 * visibility is toggled. That keeps all eight fee tables crawlable and
 * findable with Ctrl+F while showing one at a time.
 */
export default function ProgramTabs({
  programs,
}: {
  programs: readonly ProgramTab[];
}) {
  const [activeId, setActiveId] = useState<string>(programs[0]?.id ?? '');

  if (programs.length === 0) return null;

  const active = programs.find((p) => p.id === activeId) ?? programs[0];

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
                onClick={() => setActiveId(p.id)}
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
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="mb-1 text-base font-semibold text-primary">
                Fee structure not yet published
              </p>
              <p className="text-sm text-gray-500">
                Please check back later for the fee table for this program.
              </p>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
