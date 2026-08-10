'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Club } from '@prisma/client';
import ImageUploader from '@/components/admin/ImageUploader';
import StatsEditor from '@/components/admin/StatsEditor';
import ActivitiesEditor from '@/components/admin/ActivitiesEditor';
import {
  updateClubDetailAction,
  type ActionResult,
} from '@/lib/admin-actions/club-detail';

type State = ActionResult | { ok: null };

export default function ClubDetailForm({ club }: { club: Club }) {
  const action = updateClubDetailAction.bind(null, club.slug);
  const [state, formAction, pending] = useActionState<State, FormData>(action, { ok: null });

  useEffect(() => {
    if (state.ok === true) toast.success('Club page saved');
    if (state.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Hero">
        <TextField label="Hero title (optional)" name="heroTitle"
                   defaultValue={club.heroTitle ?? ''}
                   placeholder={`Falls back to “${club.name}”`} />
        <TextField label="Hero overline (optional)" name="heroOverline"
                   defaultValue={club.heroOverline ?? ''}
                   placeholder="Student Society" />
        <ImageUploader kind="club-image" name="heroImage" aspectRatio="wide"
                       label="Hero image (optional)"
                       recommendedSize="Landscape · 1920×600 (16:5). Falls back to the cover image."
                       initialUrl={club.heroImageUrl ?? undefined}
                       initialPublicId={club.heroImagePublicId ?? undefined} />
      </Card>

      <Card title="Intro section">
        <p className="-mt-2 text-xs text-gray-500">
          Clearing the heading removes this page entirely — the club then
          shows as a card on the listing only.
        </p>
        <TextField label="Overline (optional)" name="introOverline"
                   defaultValue={club.introOverline ?? ''}
                   placeholder="About the Society" />
        <TextAreaField label="Heading (HTML allowed)" name="introHeading" rows={2}
                       defaultValue={club.introHeading ?? ''} />
        <p className="text-xs text-gray-500 -mt-2">
          Inline HTML allowed. Gradient emphasis pattern:{' '}
          <code className="font-mono">&lt;span class=&quot;text-gradient&quot;&gt;…&lt;/span&gt;</code>
        </p>
        <TextAreaField label="Body paragraph #1" name="introBody1" rows={4}
                       defaultValue={club.introBody1 ?? ''} />
        <TextAreaField label="Body paragraph #2" name="introBody2" rows={4}
                       defaultValue={club.introBody2 ?? ''} />
        <ImageUploader kind="club-image" name="introImage" aspectRatio="auto"
                       label="Intro image (optional)"
                       recommendedSize="Portrait or square · falls back to the cover image."
                       initialUrl={club.introImageUrl ?? undefined}
                       initialPublicId={club.introImagePublicId ?? undefined} />
      </Card>

      <Card title="Figures">
        <p className="text-xs text-gray-500 -mt-2">
          The 4 figures below the intro. Value on the left (e.g.{' '}
          <code className="font-mono">148+</code>), label on the right.
        </p>
        <StatsEditor name="stats" initialValue={club.stats} />
      </Card>

      <Card title="Activities section">
        <TextField label="Section overline (optional)" name="activitiesOverline"
                   defaultValue={club.activitiesOverline ?? ''}
                   placeholder="What We Do" />
        <TextField label="Section heading (optional)" name="activitiesHeading"
                   defaultValue={club.activitiesHeading ?? ''}
                   placeholder="Competitions & Training" />
        <ActivitiesEditor name="activities" initialValue={club.activities} />
      </Card>

      <Card title="Closing panel">
        <TextField label="Overline (optional)" name="networkOverline"
                   defaultValue={club.networkOverline ?? ''}
                   placeholder="Get Involved" />
        <TextField label="Heading (optional)" name="networkHeading"
                   defaultValue={club.networkHeading ?? ''}
                   placeholder="Join the Society" />
        <TextAreaField label="Body" name="networkBody" rows={4}
                       defaultValue={club.networkBody ?? ''} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          <TextField label="Primary button label" name="networkPrimaryCtaLabel"
                     defaultValue={club.networkPrimaryCtaLabel ?? ''}
                     placeholder="Email the Society" />
          <TextField label="Primary button link" name="networkPrimaryCtaHref"
                     defaultValue={club.networkPrimaryCtaHref ?? ''}
                     placeholder="mailto:club@su.edu.bd" />
          <TextField label="Secondary button label (optional)" name="networkSecondaryCtaLabel"
                     defaultValue={club.networkSecondaryCtaLabel ?? ''}
                     placeholder="Follow on Facebook" />
          <TextField label="Secondary button link (optional)" name="networkSecondaryCtaHref"
                     defaultValue={club.networkSecondaryCtaHref ?? ''}
                     placeholder="https://facebook.com/…" />
        </div>
        <p className="text-xs text-gray-500">
          Both buttons need a label and a link to appear. Links may be a{' '}
          <code className="font-mono">mailto:</code> address, an external URL, or an
          internal path.
        </p>
      </Card>

      <Card title="Contact strip">
        <p className="-mt-2 text-xs text-gray-500">
          The two cards above the footer. Leave a value blank to drop its
          card; blank both and the whole strip disappears.
        </p>
        <TextField label="Heading (optional)" name="contactHeading"
                   defaultValue={club.contactHeading ?? ''}
                   placeholder="Quick Contact Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Phone" name="contactPhone"
                     defaultValue={club.contactPhone ?? ''}
                     placeholder="+880 1743-431284" />
          <TextField label="Hours line (optional)" name="contactHours"
                     defaultValue={club.contactHours ?? ''}
                     placeholder="Sat–Thu, 9 AM – 5 PM" />
        </div>
        <TextField label="E-mail" name="contactEmail"
                   defaultValue={club.contactEmail ?? ''}
                   placeholder="club@su.edu.bd" />
      </Card>

      {state.ok === false && (
        <div role="alert"
             className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <Link href={`/admin/clubs`}
              className="px-4 py-2.5 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors">
          ← Edit the club card
        </Link>
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
