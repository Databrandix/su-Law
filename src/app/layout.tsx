import type { Metadata } from 'next';
import { Poppins, Montserrat, Hind_Siliguri } from 'next/font/google';
import { getDepartmentIdentity } from '@/lib/identity';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  subsets: ['latin', 'bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

const SITE_URL = 'https://su-law.vercel.app';
const SITE_NAME = 'Sonargaon University — Department of Law';
const SITE_DESCRIPTION =
  'Department of Law, Faculty of Arts and Humanities, Sonargaon University — programs, faculty, research, admissions, and campus services.';
// Fallback share card, used when DepartmentIdentity.ogImageUrl is unset
// (fresh install, or before the chair uploads one).
const OG_IMAGE_FALLBACK = '/assets/og-banner.webp';

// generateMetadata (not a static `metadata` object) so the share card can
// come from the DB and be swapped in /admin without a deploy.
// getDepartmentIdentity is React.cache-wrapped and shares its query with
// RootLayout below, so this costs no extra round-trip.
export async function generateMetadata(): Promise<Metadata> {
  const dept = await getDepartmentIdentity();
  const ogImage = dept.ogImageUrl || OG_IMAGE_FALLBACK;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      // Pages already end their own title with "— Department of Law",
      // so appending the department again produced "… — Department of
      // Law — Sonargaon University Law": the department named twice,
      // trailing a dangling "Law". The suffix is the university alone.
      template: '%s — Sonargaon University',
    },
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

// Phase 18 — minimal root layout. The previous root layout pulled in
// the admin-vs-public chrome conditional via `headers()` to read
// x-pathname, which forced every public route into dynamic rendering
// and blocked ISR. Chrome rendering now lives in the (public)/ and
// admin/ route group layouts; this root layout only sets up the
// HTML shell, fonts, and the DB-driven brand-color CSS vars on
// <html>. getDepartmentIdentity is React.cache-wrapped and a plain
// DB query, so it does NOT force dynamic rendering — the resulting
// brand vars are baked into the ISR cache for public routes.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dept = await getDepartmentIdentity();
  const brandVars = {
    '--color-primary': dept.primaryColor,
    '--color-accent': dept.accentColor,
    '--color-button-yellow': dept.buttonColor,
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${montserrat.variable} ${hindSiliguri.variable}`}
      style={brandVars}
    >
      <body className="min-h-screen flex flex-col selection:bg-accent/30">
        {children}
      </body>
    </html>
  );
}
