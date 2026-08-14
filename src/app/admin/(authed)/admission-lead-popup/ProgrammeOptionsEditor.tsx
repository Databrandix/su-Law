'use client';

import { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * The popup's dropdown list, as a set of one-line rows.
 *
 * Deliberately not ParagraphsEditor: that one is built around 4-row
 * textareas for prose, which reads wrong for a degree name. Same
 * hidden-input contract though — the server reads
 * FormData.getAll('programmeOptions').
 *
 * Leaving the list empty is a supported state, not an incomplete one:
 * the popup then follows the Program table, so a newly published
 * degree appears without anyone revisiting this form.
 */
export default function ProgrammeOptionsEditor({
  initialValue,
  fallbackOptions,
  name = 'programmeOptions',
}: {
  initialValue?: readonly string[];
  /** What the popup would show today if this list stays empty. */
  fallbackOptions: readonly string[];
  name?: string;
}) {
  const [options, setOptions] = useState<string[]>([...(initialValue ?? [])]);

  function add() {
    setOptions([...options, '']);
  }
  function update(i: number, value: string) {
    setOptions(options.map((o, idx) => (idx === i ? value : o)));
  }
  function remove(i: number) {
    setOptions(options.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    setOptions(next);
  }

  return (
    <div className="space-y-2">
      {options.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-3">
          <p className="text-xs font-medium text-gray-600">
            Following the Programs list automatically.
          </p>
          {fallbackOptions.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {fallbackOptions.map((o) => (
                <li key={o} className="text-xs text-gray-500">
                  • {o}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-amber-700">
              No programs found — the popup stays hidden until there is at
              least one option.
            </p>
          )}
        </div>
      ) : (
        options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={o}
              onChange={(e) => update(i, e.target.value)}
              placeholder="e.g. Bachelor of Laws (LL.B.)"
              maxLength={200}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="p-1 text-gray-400 transition-colors hover:text-primary disabled:opacity-30"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === options.length - 1}
                aria-label="Move down"
                className="p-1 text-gray-400 transition-colors hover:text-primary disabled:opacity-30"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove option"
                className="p-1 text-gray-400 transition-colors hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent/80"
      >
        <Plus size={14} /> Add option
      </button>

      <p className="text-xs text-gray-500">
        Add rows only to override the automatic list. Remove every row to go
        back to following Programs. Blank rows are ignored on save.
      </p>

      {/* Hidden inputs — server reads via FormData.getAll(name). */}
      {options.map((o, i) => (
        <input key={`hidden-${i}`} type="hidden" name={name} value={o} />
      ))}
    </div>
  );
}
