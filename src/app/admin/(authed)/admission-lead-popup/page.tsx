import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import PopupForm from './PopupForm';

export const metadata = { title: 'Admission Lead Popup' };

export default async function AdmissionLeadPopupPage() {
  const session = await getSession();
  if (!session?.user) redirect('/admin/login');

  const [popup, programs] = await Promise.all([
    prisma.admissionLeadPopup.findUnique({ where: { id: 'singleton' } }),
    prisma.program.findMany({
      orderBy: { displayOrder: 'asc' },
      select: { programName: true, degreeCode: true },
    }),
  ]);

  // Same label shape getAdmissionLeadPopup() builds, so the preview in
  // the editor matches what the popup would actually render.
  const fallbackOptions = programs.map((p) => {
    const code = p.degreeCode ? p.degreeCode.replace(/\.?$/, '.') : null;
    return code ? `${p.programName} (${code})` : p.programName;
  });

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Admission Lead Popup
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          The lead form that opens on the homepage after a visitor has stayed a
          while. Submissions land in{' '}
          <a href="/admin/admission-leads" className="text-accent hover:underline">
            Admission Leads
          </a>
          .
        </p>
      </header>

      <PopupForm initial={popup} fallbackOptions={fallbackOptions} />
    </div>
  );
}
