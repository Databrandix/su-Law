'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X as XIcon, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { AdmissionLeadPopupConfig } from '@/lib/identity';

// Honeypot field name — must match HONEYPOT_FIELD in the submit route.
const HONEYPOT_NAME = 'website';

// Errors are rendered inside the dialog rather than pushed through
// sonner: <Toaster /> is only mounted in the admin layout, so a toast
// raised from a public page is swallowed and the form looks dead.
type FieldName = 'fullName' | 'mobile' | 'programme';

// Mirrors bangladeshiMobileSchema in lib/validation.ts. Duplicated on
// purpose — this one only buys instant feedback; the server rule is
// still the authority and runs on every submit.
const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;

// localStorage keys. Two separate keys rather than one state value
// because the two outcomes expire differently: a dismissal is a snooze
// the CMS can re-tune, a submission is permanent.
const SUBMITTED_KEY = 'su-admission-lead:submitted';
const DISMISSED_AT_KEY = 'su-admission-lead:dismissed-at';

type Props = { config: AdmissionLeadPopupConfig };

/**
 * Homepage lead capture. Opens once the visitor has stayed
 * `delaySeconds` on the page, then stays out of the way:
 *
 *   submitted  → never shown again
 *   dismissed  → suppressed for `redisplayAfterHours`, then eligible
 *
 * All copy, the timings and the dropdown come from
 * /admin/admission-lead-popup, so nothing here needs a deploy to change.
 */
export default function AdmissionLeadPopup({ config }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [programme, setProgramme] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<FieldName | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const programmeRef = useRef<HTMLSelectElement>(null);
  // Remembers what had focus before the dialog took it, so closing
  // returns the caret where the visitor left it.
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // ── Open on a timer, unless this visitor has opted out already ──
  useEffect(() => {
    // localStorage is read here rather than during render: the server
    // has no access to it, and reading it in the body would produce a
    // hydration mismatch.
    let optedOut = false;
    try {
      if (window.localStorage.getItem(SUBMITTED_KEY) === '1') {
        optedOut = true;
      } else {
        const raw = window.localStorage.getItem(DISMISSED_AT_KEY);
        if (raw) {
          const dismissedAt = Number(raw);
          const windowMs = config.redisplayAfterHours * 60 * 60 * 1000;
          // A corrupt or future-dated value would otherwise suppress
          // the popup forever, so anything unparseable is ignored.
          if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < windowMs) {
            optedOut = true;
          }
        }
      }
    } catch {
      // Private mode / storage disabled — fall through and show it.
    }
    if (optedOut) return;

    const timer = window.setTimeout(() => {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }, config.delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [config.delaySeconds, config.redisplayAfterHours]);

  // Typing is the visitor acting on the message, so retract it rather
  // than leaving a stale complaint under the field they just fixed.
  const clearError = useCallback(() => {
    setError(null);
    setInvalidField(null);
  }, []);

  const remember = useCallback((key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Nothing to do — worst case the popup appears again later.
    }
  }, []);

  // Dismissal — the X, the backdrop and Escape all land here. Snoozes
  // rather than closes forever, per redisplayAfterHours.
  const dismiss = useCallback(() => {
    if (pending) return;
    remember(DISMISSED_AT_KEY, String(Date.now()));
    setOpen(false);
    lastFocusedRef.current?.focus?.();
  }, [pending, remember]);

  // ── Scroll lock, Escape to close, and initial focus ──
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKeyDown);

    // Focus the first field so keyboard users land inside the dialog
    // instead of behind it.
    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, dismiss]);

  // Points at the first field that fails, so the message can be shown
  // next to the control the visitor has to fix.
  function firstProblem(): { field: FieldName; message: string } | null {
    if (!fullName.trim()) {
      return { field: 'fullName', message: 'Please enter your full name.' };
    }
    if (!BD_MOBILE.test(mobile.replace(/[\s()-]/g, ''))) {
      return {
        field: 'mobile',
        message: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678',
      };
    }
    if (!programme) {
      return { field: 'programme', message: 'Please choose a programme from the list.' };
    }
    return null;
  }

  function fail(message: string, field: FieldName | null) {
    setError(message);
    setInvalidField(field);
    if (field === 'fullName') nameInputRef.current?.focus();
    if (field === 'mobile') mobileInputRef.current?.focus();
    if (field === 'programme') programmeRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    // Catch the obvious problems before a round trip. The form sets
    // noValidate so the browser's own bubbles never appear, which is
    // what left an unpicked dropdown failing silently.
    const problem = firstProblem();
    if (problem) {
      fail(problem.message, problem.field);
      return;
    }

    setError(null);
    setInvalidField(null);
    setPending(true);
    try {
      const res = await fetch('/api/admission-leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          mobile,
          programme,
          [HONEYPOT_NAME]: honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The route's messages are already visitor-facing, so show them
        // verbatim and highlight the field they name where we can.
        const message =
          typeof data?.error === 'string' ? data.error : 'Submission failed. Please try again.';
        const path = data?.issues?.[0]?.path;
        fail(message, path === 'mobile' || path === 'fullName' ? path : null);
        return;
      }
      // Permanent: someone who has given us their number should not be
      // asked again on every future visit.
      remember(SUBMITTED_KEY, '1');
      setSubmitted(true);
      window.setTimeout(() => setOpen(false), 2600);
    } catch {
      fail('Network error. Please check your connection and try again.', null);
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admission-lead-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={dismiss}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Gradient hairline along the top edge — the brand cue that
            keeps an otherwise plain white card on-brand. */}
        <div
          aria-hidden="true"
          className="h-1.5 w-full rounded-t-3xl bg-gradient-to-r from-primary via-accent to-primary"
        />

        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          aria-label="Close"
          className="absolute right-4 top-6 z-[1] rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <XIcon size={16} />
        </button>

        {submitted ? (
          <div className="px-7 py-14 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="font-display text-lg font-bold text-primary">
              We&apos;ve got your details.
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-600">
              {config.footerNote}
            </p>
          </div>
        ) : (
          <div className="px-7 pb-7 pt-6">
            <h2
              id="admission-lead-title"
              className="pr-10 font-display text-[22px] font-bold leading-snug text-primary"
            >
              {config.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {config.subheading}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <Field label={config.nameLabel} htmlFor="lead-name">
                <input
                  id="lead-name"
                  ref={nameInputRef}
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearError();
                  }}
                  placeholder={config.namePlaceholder}
                  autoComplete="name"
                  maxLength={200}
                  aria-invalid={invalidField === 'fullName' || undefined}
                  className={fieldClass(invalidField === 'fullName')}
                />
              </Field>

              <Field label={config.mobileLabel} htmlFor="lead-mobile">
                <input
                  id="lead-mobile"
                  ref={mobileInputRef}
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    clearError();
                  }}
                  placeholder={config.mobilePlaceholder}
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={30}
                  aria-invalid={invalidField === 'mobile' || undefined}
                  className={fieldClass(invalidField === 'mobile')}
                />
              </Field>

              <Field label={config.programmeLabel} htmlFor="lead-programme">
                {/* Inline colours on select/option: Chrome paints the
                    native dropdown panel with the inherited colour,
                    which reads as near-invisible inside this card. */}
                <select
                  id="lead-programme"
                  ref={programmeRef}
                  required
                  value={programme}
                  onChange={(e) => {
                    setProgramme(e.target.value);
                    clearError();
                  }}
                  aria-invalid={invalidField === 'programme' || undefined}
                  className={`${fieldClass(invalidField === 'programme')} appearance-none bg-[length:18px] bg-[right_0.9rem_center] bg-no-repeat pr-10`}
                  style={{
                    color: programme ? '#111827' : '#9ca3af',
                    backgroundColor: '#f3f4f6',
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                  }}
                >
                  <option value="" disabled style={optionStyle}>
                    {config.programmePlaceholder}
                  </option>
                  {config.programmeOptions.map((name) => (
                    <option key={name} value={name} style={optionStyle}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Honeypot — hidden from real users and assistive tech. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[-9999px] h-px w-px overflow-hidden opacity-0"
              >
                <label htmlFor="lead-website">Website</label>
                <input
                  id="lead-website"
                  type="text"
                  name={HONEYPOT_NAME}
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-[15px] font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {pending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    {config.submitLabel}
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              <p className="pt-1 text-center text-xs text-gray-400">
                {config.footerNote}
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const optionStyle = { color: '#111827', backgroundColor: '#ffffff' };

const inputClass =
  'w-full rounded-xl border bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:bg-white focus:outline-none focus:ring-2';

// A red ring on the offending control, so the banner's message and the
// field it refers to are visually linked.
function fieldClass(invalid: boolean): string {
  return `${inputClass} ${
    invalid
      ? 'border-red-400 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200'
      : 'border-transparent focus:border-accent focus:ring-accent/30'
  }`;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-semibold text-gray-700"
      >
        {label}
        <span className="ml-0.5 text-accent" aria-hidden="true">
          *
        </span>
      </label>
      {children}
    </div>
  );
}
