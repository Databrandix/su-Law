'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import type { HomeOverview } from '@prisma/client';
import ImageUploader from '@/components/admin/ImageUploader';
import {
  updateHomeOverviewAction,
  type ActionResult,
} from '@/lib/admin-actions/home-overview';

type State = ActionResult | { ok: null };

export default function HomeOverviewForm({ initial }: { initial: HomeOverview | null }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    updateHomeOverviewAction,
    { ok: null },
  );

  useEffect(() => {
    if (state.ok === true) toast.success('Overview section saved');
    if (state.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Content">
        <TextField label="Heading" name="heading" required
                   defaultValue={initial?.heading ?? ''}
                   placeholder="Business Administration (BA)" />
        <TextAreaField label="Body (HTML allowed)" name="body" required rows={6}
                       defaultValue={initial?.body ?? ''}
                       placeholder="The Department of Business Administration is committed to…" />
        <p className="text-xs text-gray-500 -mt-2">
          Inline emphasis is allowed:{' '}
          <code className="font-mono">&lt;strong&gt;…&lt;/strong&gt;</code>,{' '}
          <code className="font-mono">&lt;em&gt;…&lt;/em&gt;</code>.
        </p>
      </Card>

      <Card title="Image">
        <ImageUploader
          kind="home-overview-image"
          name="image"
          aspectRatio="wide"
          label="Section image"
          initialUrl={initial?.imageUrl}
          initialPublicId={initial?.imagePublicId}
        />
        <TextField label="Image alt text" name="imageAlt"
                   defaultValue={initial?.imageAlt ?? ''}
                   placeholder="Sonargaon University Business Administration students" />
        <p className="text-xs text-gray-500 -mt-2">
          Describes the image for screen readers and search engines.
        </p>
      </Card>

      <Card title="Left button">
        <TextField label="Button label" name="primaryCtaLabel" required
                   defaultValue={initial?.primaryCtaLabel ?? ''}
                   placeholder="Explore More" />
        <TextField label="Link URL" name="primaryCtaHref" required
                   defaultValue={initial?.primaryCtaHref ?? ''}
                   placeholder="/about/overview" />
        <CheckboxField label="Opens in new tab (external link)"
                       name="primaryCtaExternal"
                       defaultChecked={initial?.primaryCtaExternal ?? false} />
      </Card>

      <Card title="Right button">
        <TextField label="Button label" name="secondaryCtaLabel" required
                   defaultValue={initial?.secondaryCtaLabel ?? ''}
                   placeholder="Dean's Message" />
        <TextField label="Link URL" name="secondaryCtaHref" required
                   defaultValue={initial?.secondaryCtaHref ?? ''}
                   placeholder="/about/deans-message" />
        <CheckboxField label="Opens in new tab (external link)"
                       name="secondaryCtaExternal"
                       defaultChecked={initial?.secondaryCtaExternal ?? false} />
      </Card>

      {state.ok === false && (
        <div role="alert"
             className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending}
                className="bg-primary hover:bg-primary/90 text-white font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/40">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
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

function TextAreaField({
  label, name, defaultValue, required, rows = 3, placeholder,
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

function CheckboxField({
  label, name, defaultChecked,
}: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked}
             className="mt-0.5 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent/50" />
      <span>{label}</span>
    </label>
  );
}
