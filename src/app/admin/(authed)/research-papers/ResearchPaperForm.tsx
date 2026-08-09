'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ResearchPaper } from '@prisma/client';
import {
  createResearchPaperAction,
  updateResearchPaperAction,
  type ActionResult,
} from '@/lib/admin-actions/research-papers';

type State = ActionResult | { ok: null };

export default function ResearchPaperForm({ initial }: { initial: ResearchPaper | null }) {
  const isEdit = !!initial;
  const action = isEdit ? updateResearchPaperAction.bind(null, initial!.id) : createResearchPaperAction;
  const [state, formAction, pending] = useActionState<State, FormData>(action, { ok: null });

  useEffect(() => {
    if (state.ok === true) toast.success(isEdit ? 'Research paper saved' : 'Research paper created');
    if (state.ok === false) toast.error(state.error);
  }, [state, isEdit]);

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Paper">
        <TextAreaField label="Title" name="title" required rows={2} defaultValue={initial?.title ?? ''} />
        <TextAreaField label="Authors" name="authors" required rows={2}
                       defaultValue={initial?.authors ?? ''}
                       placeholder="Comma-separated list" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Author designation (optional)" name="authorRole"
                     defaultValue={initial?.authorRole ?? ''}
                     placeholder="Assistant Professor" />
          <TextField label="Faculty profile slug (optional)" name="facultySlug"
                     defaultValue={initial?.facultySlug ?? ''}
                     placeholder="shoriful-islam" />
        </div>
        <p className="text-xs text-gray-500">
          The designation renders under the author name. Setting the slug turns
          that name into a link to <code className="font-mono">/faculty-member/&lt;slug&gt;</code>;
          leave it blank for external authors.
        </p>

        <CoAuthorsEditor initial={initial?.coAuthors} />
        <TextAreaField label="Department / Affiliation (area)" name="area" required rows={2}
                       defaultValue={initial?.area ?? ''} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Link (DOI / journal page, optional)" name="link"
                     defaultValue={initial?.link ?? ''}
                     placeholder="https://doi.org/…" />
          <TextField label="Link button text (optional)" name="linkLabel"
                     defaultValue={initial?.linkLabel ?? ''}
                     placeholder="View Publication" />
        </div>
        <p className="text-xs text-gray-500">
          The link renders as a button below the paper. Leave the button text
          blank to use &quot;View Publication&quot;.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Date (free-form, optional)" name="date"
                     defaultValue={initial?.date ?? ''}
                     placeholder='"14 August 2019" / "2023" / "January–February 2023"' />
          <NumberField label="Publication year (optional)" name="publicationYear"
                       defaultValue={initial?.publicationYear ?? ''} min={1900} max={2100}
                       placeholder="2023" />
        </div>
        <p className="text-xs text-gray-500">
          The structured year (left) enables optional year-based sort/filter; the free-form date string (right) keeps human-readable nuance like &quot;January–February 2023&quot;.
        </p>
      </Card>

      <Card title="Journal metadata">
        <TextField label="Publisher (optional)" name="publisher"
                   defaultValue={initial?.publisher ?? ''}
                   placeholder="Wiley / Springer Nature / Elsevier" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Indexing (optional)" name="indexing"
                     defaultValue={initial?.indexing ?? ''}
                     placeholder="SCOPUS &amp; WoS SSCI / Non-Indexed" />
          <TextField label="Journal quartile (optional)" name="quartile"
                     defaultValue={initial?.quartile ?? ''}
                     placeholder="Q1 / Q2 / Q3 / Q4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="CiteScore / Impact Factor (optional)" name="metrics"
                     defaultValue={initial?.metrics ?? ''}
                     placeholder="CiteScore: 14.5 · IF: 8.2" />
          <TextField label="Author position (optional)" name="authorPosition"
                     defaultValue={initial?.authorPosition ?? ''}
                     placeholder="1st / Sole author / 2nd &amp; corresponding" />
        </div>
      </Card>

      {state.ok === false && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <Link href="/admin/research-papers" className="px-4 py-2.5 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors">
          ← Back to research papers
        </Link>
        <button type="submit" disabled={pending}
                className="bg-primary hover:bg-primary/90 text-white font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/40">
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create paper'}
        </button>
      </div>
    </form>
  );
}

type CoAuthor = { name: string; role: string; facultySlug: string };

/**
 * Extra department authors on the same paper.
 *
 * A co-authored paper is one publication, so it gets one row here rather
 * than one row per author — otherwise the same title repeats down
 * /research and the publication count is overstated. Each entry below
 * renders under the main author inside the same card, in this order.
 *
 * Fields serialize as coAuthorName.N / coAuthorRole.N / coAuthorSlug.N,
 * which the server action reassembles; rows left blank are discarded.
 */
function CoAuthorsEditor({ initial }: { initial: unknown }) {
  const [rows, setRows] = useState<CoAuthor[]>(() => normalizeCoAuthors(initial));

  function update(i: number, key: keyof CoAuthor, value: string) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  return (
    <div className="pt-2 border-t border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <span className="block text-sm font-medium text-gray-700">
          Co-authors from the department (optional)
        </span>
        <button
          type="button"
          onClick={() => setRows([...rows, { name: '', role: '', facultySlug: '' }])}
          className="text-xs font-semibold text-accent hover:underline"
        >
          + Add co-author
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Listed under the main author on the same card, in this order. Add a
        co-author here instead of creating a second paper — one paper should
        appear on <code className="font-mono">/research</code> only once.
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Single-author paper.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
              <input
                name={`coAuthorName.${i}`}
                value={r.name}
                onChange={(e) => update(i, 'name', e.target.value)}
                placeholder="Full name"
                aria-label={`Co-author ${i + 1} name`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
              <input
                name={`coAuthorRole.${i}`}
                value={r.role}
                onChange={(e) => update(i, 'role', e.target.value)}
                placeholder="Designation"
                aria-label={`Co-author ${i + 1} designation`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
              <input
                name={`coAuthorSlug.${i}`}
                value={r.facultySlug}
                onChange={(e) => update(i, 'facultySlug', e.target.value)}
                placeholder="profile-slug (optional)"
                aria-label={`Co-author ${i + 1} profile slug`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                aria-label={`Remove co-author ${i + 1}`}
                className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Read the Json column defensively — it may be null or hand-edited. */
function normalizeCoAuthors(value: unknown): CoAuthor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): CoAuthor[] => {
    if (typeof raw !== 'object' || raw === null) return [];
    const o = raw as { name?: unknown; role?: unknown; facultySlug?: unknown };
    if (typeof o.name !== 'string') return [];
    return [
      {
        name: o.name,
        role: typeof o.role === 'string' ? o.role : '',
        facultySlug: typeof o.facultySlug === 'string' ? o.facultySlug : '',
      },
    ];
  });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      {children}
    </section>
  );
}

function TextField({
  label, name, defaultValue, required, placeholder,
}: { label: string; name: string; defaultValue?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <input id={name} name={name} type="text"
             defaultValue={defaultValue} required={required} placeholder={placeholder}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
    </div>
  );
}

function NumberField({
  label, name, defaultValue, required, placeholder, min, max,
}: { label: string; name: string; defaultValue?: string | number; required?: boolean; placeholder?: string; min?: number; max?: number }) {
  const def = defaultValue === null || defaultValue === undefined ? '' : String(defaultValue);
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <input id={name} name={name} type="number" min={min} max={max}
             defaultValue={def} required={required} placeholder={placeholder}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
    </div>
  );
}

function TextAreaField({
  label, name, defaultValue, required, rows = 4, placeholder,
}: { label: string; name: string; defaultValue?: string; required?: boolean; rows?: number; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <textarea id={name} name={name}
                defaultValue={defaultValue} required={required} rows={rows} placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-y" />
    </div>
  );
}
