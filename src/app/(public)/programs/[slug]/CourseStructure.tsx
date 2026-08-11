'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

export type CourseRow = {
  semester: string;
  code: string;
  title: string;
  credits: number;
  type: string;
};

type SemesterGroup = {
  name: string;
  slug: string;
  courses: CourseRow[];
  credits: number;
};

/** Credits print as "0.75" / "18" rather than "18.00". */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/**
 * Course Structure — one collapsible panel per semester, each holding a
 * Code / Course / Credits table.
 *
 * The first semester starts open so the section never reads as an
 * unexplained stack of closed bars; the rest are collapsed to keep a
 * 44-course curriculum from burying the sections below it.
 */
export default function CourseStructure({ groups }: { groups: SemesterGroup[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    groups.length > 0 ? { [groups[0].slug]: true } : {},
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      {groups.map((g) => {
        const isOpen = open[g.slug] === true;
        const panelId = `semester-${g.slug}`;
        return (
          <div key={g.slug} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen((prev) => ({ ...prev, [g.slug]: !prev[g.slug] }))}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                  <BookOpen size={17} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[15px] font-bold text-primary">
                    {g.name}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {g.courses.length} courses · {fmt(g.credits)} credits
                  </span>
                </span>
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen && (
              // Horizontal scroll rather than a squeezed table on narrow
              // screens — min-w keeps all three columns legible.
              <div id={panelId} className="overflow-x-auto border-t border-gray-100">
                <table className="w-full min-w-[34rem] text-left text-[14px]">
                  <caption className="sr-only">
                    Courses in {g.name}
                  </caption>
                  <thead>
                    <tr className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      <th scope="col" className="px-5 py-2.5">Code</th>
                      <th scope="col" className="px-5 py-2.5">Course</th>
                      <th scope="col" className="px-5 py-2.5 text-right">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.courses.map((c) => (
                      <tr key={`${c.code}-${c.title}`} className="border-t border-gray-100">
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-[13px] text-primary">
                          {c.code}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-gray-800">{c.title}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-gray-700">
                          {fmt(c.credits)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
