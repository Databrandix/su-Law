'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AboutDepartmentLayout } from '@prisma/client';
import ImageUploader from '@/components/admin/ImageUploader';
import HeroImagePositionSlider from '@/components/admin/HeroImagePositionSlider';
import {
  updateAboutDepartmentLayoutAction,
  type ActionResult,
} from '@/lib/admin-actions/about-department-layout';

type State = ActionResult | { ok: null };

type PdfState = { url: string; publicId: string; fileName: string };

export default function AboutDepartmentLayoutForm({
  initial,
}: {
  initial: AboutDepartmentLayout | null;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    updateAboutDepartmentLayoutAction,
    { ok: null },
  );

  // The PDF uploader reports through onChange rather than rendering its
  // own form inputs, so its values are mirrored into hidden inputs.
  const [pdf, setPdf] = useState<PdfState>({
    url:      initial?.pdfUrl ?? '',
    publicId: initial?.pdfPublicId ?? '',
    fileName: initial?.pdfFileName ?? '',
  });

  useEffect(() => {
    if (state.ok === true) toast.success('Department Layout saved');
    if (state.ok === false) toast.error(state.error);
  }, [state]);

  const paragraphs = Array.isArray(initial?.paragraphs)
    ? (initial.paragraphs as unknown[])
        .filter((p): p is string => typeof p === 'string')
        .join('\n')
    : '';

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Hero">
        <TextField label="Hero title" name="heroTitle" required
                   defaultValue={initial?.heroTitle ?? 'Department Layout'} />
        <TextField label="Hero overline (optional)" name="heroOverline"
                   defaultValue={initial?.heroOverline ?? ''} placeholder="About" />
        <ImageUploader kind="about-image" name="heroImage" aspectRatio="wide"
                       label="Hero image"
                       initialUrl={initial?.heroImageUrl}
                       initialPublicId={initial?.heroImagePublicId} />
        <HeroImagePositionSlider
          name="heroImageVerticalPercent"
          initialValue={initial?.heroImageVerticalPercent}
        />
      </Card>

      <Card title="Intro text (optional)">
        <TextAreaField
          label="Paragraphs — one per line"
          name="paragraphs"
          rows={5}
          defaultValue={paragraphs}
          placeholder="Leave empty to show only the download card."
        />
      </Card>

      <Card title="Layout card">
        <TextField label="Caption under the cover" name="cardTitle" required
                   defaultValue={initial?.cardTitle ?? 'Department Layout'}
                   placeholder="BBA Department Layout" />

        <ImageUploader kind="department-layout-cover" name="cover"
                       label="Cover image"
                       initialUrl={initial?.coverUrl}
                       initialPublicId={initial?.coverPublicId} />

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Layout PDF</p>
          <p className="mb-2 text-xs text-gray-500">
            The Download button appears once this is uploaded.
          </p>
          <ImageUploader
            kind="department-layout-pdf"
            name="pdf"
            accept="application/pdf"
            initialUrl={pdf.url}
            initialPublicId={pdf.publicId}
            initialFileType="pdf"
            initialFileName={pdf.fileName}
            onChange={(url, publicId, meta) => {
              setPdf({ url, publicId, fileName: meta?.fileName ?? '' });
            }}
          />
          <input type="hidden" name="pdfUrl" value={pdf.url} />
          <input type="hidden" name="pdfPublicId" value={pdf.publicId} />
          <input type="hidden" name="pdfFileName" value={pdf.fileName} />
        </div>
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
