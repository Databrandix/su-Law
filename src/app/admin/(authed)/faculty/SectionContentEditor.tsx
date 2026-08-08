'use client';

import { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { SectionContent, SectionItem } from '@/lib/faculty-section-content';

type Item = { text: string; link: string };
type Group = { heading: string; items: Item[] };

type Props = {
  name: string;
  label: string;
  initialValue: unknown;
  // When true, every item row gains an adjacent Link field and the
  // serialized entries become { text, link } pairs. Text + Link are
  // kept together as a single array element so add/edit/delete/
  // reorder can never desync them.
  enableLinks?: boolean;
};

// Normalize any item (string or { text, link }) into the internal shape.
function toItem(v: unknown): Item {
  if (typeof v === 'string') return { text: v, link: '' };
  if (typeof v === 'object' && v !== null) {
    const o = v as { text?: unknown; link?: unknown };
    return {
      text: typeof o.text === 'string' ? o.text : '',
      link: typeof o.link === 'string' ? o.link : '',
    };
  }
  return { text: '', link: '' };
}

// Normalize any SectionContent shape into Group[] for editing.
function normalize(v: unknown): Group[] {
  if (v == null) return [];
  if (typeof v === 'string') return [{ heading: '', items: [{ text: v, link: '' }] }];
  if (Array.isArray(v)) {
    if (v.length === 0) return [];
    if (typeof v[0] === 'object' && v[0] !== null && 'items' in v[0]) {
      return (v as Array<{ heading?: unknown; items?: unknown }>).map((g) => ({
        heading: typeof g.heading === 'string' ? g.heading : '',
        items: Array.isArray(g.items) ? g.items.map(toItem) : [],
      }));
    }
    return [{ heading: '', items: v.map(toItem) }];
  }
  return [];
}

// Serialize Group[] back to the simplest matching SectionContent shape,
// preserving round-trip identity for degenerate cases. When enableLinks
// is set, entries carrying a link serialize as { text, link } objects;
// link-less entries collapse to plain strings.
function serialize(groups: Group[], enableLinks: boolean): SectionContent | null {
  const cleaned = groups
    .map((g) => ({
      heading: g.heading.trim(),
      items: g.items.reduce<SectionItem[]>((acc, i) => {
        const text = i.text.trim();
        if (text.length === 0) return acc;
        if (enableLinks) {
          const link = i.link.trim();
          acc.push(link.length > 0 ? { text, link } : text);
        } else {
          acc.push(text);
        }
        return acc;
      }, []),
    }))
    .filter((g) => g.heading.length > 0 || g.items.length > 0);

  if (cleaned.length === 0) return null;

  // Single group with no heading collapses back to string or array.
  if (cleaned.length === 1 && cleaned[0].heading === '') {
    const items = cleaned[0].items;
    if (items.length === 1 && typeof items[0] === 'string') return items[0];
    return items;
  }

  return cleaned;
}

export default function SectionContentEditor({
  name,
  label,
  initialValue,
  enableLinks = false,
}: Props) {
  const [groups, setGroups] = useState<Group[]>(normalize(initialValue));

  function addGroup() {
    setGroups([...groups, { heading: '', items: [{ text: '', link: '' }] }]);
  }
  function removeGroup(gi: number) {
    setGroups(groups.filter((_, idx) => idx !== gi));
  }
  function updateHeading(gi: number, value: string) {
    setGroups(groups.map((g, idx) => (idx === gi ? { ...g, heading: value } : g)));
  }
  function addItem(gi: number) {
    setGroups(
      groups.map((g, idx) =>
        idx === gi ? { ...g, items: [...g.items, { text: '', link: '' }] } : g,
      ),
    );
  }
  function updateItem(gi: number, ii: number, key: 'text' | 'link', value: string) {
    setGroups(
      groups.map((g, idx) =>
        idx === gi
          ? { ...g, items: g.items.map((it, i) => (i === ii ? { ...it, [key]: value } : it)) }
          : g,
      ),
    );
  }
  function removeItem(gi: number, ii: number) {
    setGroups(
      groups.map((g, idx) =>
        idx === gi ? { ...g, items: g.items.filter((_, i) => i !== ii) } : g,
      ),
    );
  }
  function moveItem(gi: number, ii: number, dir: -1 | 1) {
    setGroups(
      groups.map((g, idx) => {
        if (idx !== gi) return g;
        const target = ii + dir;
        if (target < 0 || target >= g.items.length) return g;
        const items = [...g.items];
        [items[ii], items[target]] = [items[target], items[ii]];
        return { ...g, items };
      }),
    );
  }

  const serialized = serialize(groups, enableLinks);

  return (
    <div className="space-y-3 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {groups.length === 0 && (
          <button
            type="button"
            onClick={addGroup}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
          >
            <Plus size={12} /> Add section
          </button>
        )}
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-gray-400 italic">No content.</p>
      )}

      {groups.map((group, gi) => (
        <div key={gi} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/30">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={group.heading}
              onChange={(e) => updateHeading(gi, e.target.value)}
              placeholder="Heading (optional — leave blank for plain list)"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-semibold bg-white"
            />
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              aria-label="Remove section"
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1.5 pl-3 border-l-2 border-gray-200">
            {group.items.map((item, ii) => (
              <div key={ii} className="flex items-start gap-2">
                <span className="mt-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[11px] font-semibold">
                  {ii + 1}
                </span>
                <textarea
                  value={item.text}
                  onChange={(e) => updateItem(gi, ii, 'text', e.target.value)}
                  rows={2}
                  placeholder="Item text"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-y bg-white"
                />
                {enableLinks && (
                  <input
                    type="url"
                    value={item.link}
                    onChange={(e) => updateItem(gi, ii, 'link', e.target.value)}
                    placeholder="Link (https://…)"
                    className="w-48 md:w-64 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white"
                  />
                )}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveItem(gi, ii, -1)}
                    disabled={ii === 0}
                    aria-label="Move item up"
                    className="p-1 text-gray-400 hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(gi, ii, 1)}
                    disabled={ii === group.items.length - 1}
                    aria-label="Move item down"
                    className="p-1 text-gray-400 hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(gi, ii)}
                  aria-label="Remove item"
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors mt-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem(gi)}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              <Plus size={12} /> Add item
            </button>
          </div>
        </div>
      ))}

      {groups.length > 0 && (
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
        >
          <Plus size={14} /> Add another section
        </button>
      )}

      <input
        type="hidden"
        name={name}
        value={serialized === null ? '' : JSON.stringify(serialized)}
      />
    </div>
  );
}
