'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import type { AdmissionLeadPopup } from '@prisma/client';
import ProgrammeOptionsEditor from './ProgrammeOptionsEditor';
import {
  updateAdmissionLeadPopupAction,
  type ActionResult,
} from '@/lib/admin-actions/admission-leads';

type State = ActionResult | { ok: null };

export default function PopupForm({
  initial,
  fallbackOptions,
}: {
  initial: AdmissionLeadPopup | null;
  fallbackOptions: string[];
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    updateAdmissionLeadPopupAction,
    { ok: null },
  );

  useEffect(() => {
    if (state.ok === true) toast.success('Popup settings saved');
    if (state.ok === false) toast.error(state.error);
  }, [state]);

  const currentOptions = Array.isArray(initial?.programmeOptions)
    ? (initial.programmeOptions as unknown[]).filter(
        (v): v is string => typeof v === 'string',
      )
    : [];

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Behaviour">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={initial?.isEnabled ?? true}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent/40"
          />
          <span>
            <span className="block text-sm font-medium text-gray-700">
              Show the popup on the homepage
            </span>
            <span className="block text-xs text-gray-500">
              Unchecking this hides it everywhere at once. Leads already
              collected are kept.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <NumberField
            label="Open after (seconds on page)"
            name="delaySeconds"
            defaultValue={initial?.delaySeconds ?? 15}
            min={0}
            max={600}
            hint="How long a visitor must stay before it opens. 0 opens it immediately."
          />
          <NumberField
            label="Show again after (hours)"
            name="redisplayAfterHours"
            defaultValue={initial?.redisplayAfterHours ?? 24}
            min={0}
            max={8760}
            hint="Applies when someone closes it without submitting. Anyone who submits is never shown it again."
          />
        </div>
      </Card>

      <Card title="Heading">
        <TextField
          label="Heading"
          name="heading"
          required
          defaultValue={initial?.heading ?? 'Start your journey with Sonargaon University'}
        />
        <div>
          <label htmlFor="subheading" className="mb-1 block text-sm font-medium text-gray-700">
            Sub-heading <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="subheading"
            name="subheading"
            required
            rows={2}
            maxLength={600}
            defaultValue={
              initial?.subheading ??
              'Get personalized admission guidance from our admission team.'
            }
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </Card>

      <Card title="Form fields">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextField label="Name label" name="nameLabel" required
                     defaultValue={initial?.nameLabel ?? 'Full name'} />
          <TextField label="Name placeholder" name="namePlaceholder" required
                     defaultValue={initial?.namePlaceholder ?? 'As written on your certificate'} />
          <TextField label="Mobile label" name="mobileLabel" required
                     defaultValue={initial?.mobileLabel ?? 'Mobile number'} />
          <TextField label="Mobile placeholder" name="mobilePlaceholder" required
                     defaultValue={initial?.mobilePlaceholder ?? '01XXXXXXXXX'} />
          <TextField label="Programme label" name="programmeLabel" required
                     defaultValue={initial?.programmeLabel ?? 'Programme you are interested in'} />
          <TextField label="Programme placeholder" name="programmePlaceholder" required
                     defaultValue={initial?.programmePlaceholder ?? 'Choose a programme'} />
        </div>
        <p className="text-xs text-gray-500">
          Mobile numbers are validated as Bangladeshi numbers regardless of the
          placeholder shown here — 01712345678 and +8801712345678 are both
          accepted, and stored in the 01… form.
        </p>
      </Card>

      <Card title="Programme dropdown">
        <ProgrammeOptionsEditor
          initialValue={currentOptions}
          fallbackOptions={fallbackOptions}
        />
      </Card>

      <Card title="Button & footer">
        <TextField label="Button label" name="submitLabel" required
                   defaultValue={initial?.submitLabel ?? 'Get admission guidance'} />
        <TextField label="Footer note" name="footerNote" required
                   defaultValue={initial?.footerNote ?? 'Our admission team will contact you shortly.'} />
      </Card>

      {state.ok === false && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      {children}
    </section>
  );
}

function TextField({
  label, name, defaultValue, required, placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
    </div>
  );
}

function NumberField({
  label, name, defaultValue, min, max, hint,
}: {
  label: string;
  name: string;
  defaultValue: number;
  min: number;
  max: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        required
        min={min}
        max={max}
        step={1}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
