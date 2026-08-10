'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Users, X as XIcon, CheckCircle2, Loader2 } from 'lucide-react';

// Honeypot field name — must match HONEYPOT_FIELD in the apply route.
const HONEYPOT_NAME = 'website';

export type ClubOption = { slug: string; name: string };

type FormState = {
  fullName:   string;
  studentId:  string;
  email:      string;
  phone:      string;
  semester:   string;
  motivation: string;
  clubSlug:   string;
};

const EMPTY: Omit<FormState, 'clubSlug'> = {
  fullName:   '',
  studentId:  '',
  email:      '',
  phone:      '',
  semester:   '',
  motivation: '',
};

/**
 * Join-a-club popup, shared by every society page.
 *
 * `clubs` is the full dropdown list and `defaultClubSlug` preselects the
 * society whose page the button sits on — so a student who lands on the
 * Moot Court page and clicks Join does not have to pick it again, but
 * can still switch to another club without navigating away.
 */
export default function JoinClubModalButton({
  label,
  clubs,
  defaultClubSlug,
}: {
  label: string;
  clubs: ClubOption[];
  defaultClubSlug?: string;
}) {
  // Preselect the current page's club when it is in the list; otherwise
  // leave the dropdown on its "choose one" placeholder.
  const initialSlug =
    defaultClubSlug && clubs.some((c) => c.slug === defaultClubSlug)
      ? defaultClubSlug
      : '';

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY, clubSlug: initialSlug });
  const [honeypot, setHoneypot] = useState('');

  const chosenClub = clubs.find((c) => c.slug === form.clubSlug);

  function close() {
    if (pending) return;
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ ...EMPTY, clubSlug: initialSlug });
      setHoneypot('');
    }, 200);
  }

  // Scroll lock only — closing is via the X / Cancel buttons so a
  // partially-filled form can't be lost to a stray backdrop tap.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch('/api/club-applications/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, [HONEYPOT_NAME]: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data?.error === 'string' ? data.error : 'Submission failed',
        );
        return;
      }
      setSubmitted(true);
      toast.success('Application submitted — thanks!');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-button-yellow text-primary font-bold rounded-md shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all whitespace-nowrap"
      >
        <Users size={18} />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-club-title"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/50" />

          <div className="relative w-full max-w-2xl bg-white text-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-7 md:px-8 py-5 flex items-start justify-between gap-3 z-[1]">
              <div>
                <h2
                  id="join-club-title"
                  className="text-xl md:text-2xl font-display font-bold text-primary leading-tight"
                >
                  Join a Club
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pick the club you want to join and fill in your details — the
                  team will reach out shortly.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                aria-label="Close dialog"
                className="p-1.5 -mr-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <XIcon size={18} />
              </button>
            </div>

            {submitted ? (
              <div className="px-7 md:px-8 py-12 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mb-4">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-lg font-display font-bold text-primary mb-1">
                  Your application is in!
                </h3>
                <p className="text-sm text-gray-600 max-w-sm mx-auto">
                  We&apos;ve received your submission
                  {chosenClub ? ` for the ${chosenClub.name}` : ''}. The team
                  will get in touch via email shortly.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-6 inline-flex items-center justify-center px-5 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-7 md:px-8 py-6 space-y-5" noValidate>
                <Field label="Which club do you want to join?" required>
                  {/* Inline colors on <select>/<option> because Chrome
                      renders the native panel with the inherited color,
                      which comes out near-invisible inside this modal. */}
                  <select
                    required
                    value={form.clubSlug}
                    onChange={(e) => update('clubSlug', e.target.value)}
                    className={`${inputClass} bg-white`}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  >
                    <option value="" disabled style={optionStyle}>
                      Select a club
                    </option>
                    {clubs.map((c) => (
                      <option key={c.slug} value={c.slug} style={optionStyle}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name" required>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                      placeholder="Md. Rakib Hasan"
                      autoComplete="name"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Student ID" required>
                    <input
                      type="text"
                      required
                      value={form.studentId}
                      onChange={(e) => update('studentId', e.target.value)}
                      placeholder="SU1603141114"
                      autoComplete="off"
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Email" required>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone" required>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="+880 1XXX-XXXXXX"
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Current semester" required>
                  <select
                    required
                    value={form.semester}
                    onChange={(e) => update('semester', e.target.value)}
                    className={`${inputClass} bg-white`}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  >
                    <option value="" disabled style={optionStyle}>
                      Select your current semester
                    </option>
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => (
                      <option key={n} value={n} style={optionStyle}>
                        Semester {n}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Why do you want to join?" required>
                  <textarea
                    required
                    rows={4}
                    value={form.motivation}
                    onChange={(e) => update('motivation', e.target.value)}
                    placeholder="A short paragraph on what excites you about this club — activities, interests, what you'd like to contribute."
                    className={`${inputClass} resize-y`}
                    maxLength={2000}
                  />
                </Field>

                {/* Honeypot — hidden from real users + assistive tech. */}
                <div
                  aria-hidden="true"
                  className="absolute left-[-9999px] w-px h-px overflow-hidden opacity-0 pointer-events-none"
                >
                  <label htmlFor="join-club-website">Website</label>
                  <input
                    id="join-club-website"
                    type="text"
                    name={HONEYPOT_NAME}
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {pending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const optionStyle = { color: '#111827', backgroundColor: '#ffffff' };

// Explicit text-gray-900 + bg-white because the closing panel this
// modal opens from sets `text-white` on its descendants; without the
// override the typed value renders white-on-white.
const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
