import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import LeadsList from './LeadsList';

export const metadata = { title: 'Admission Leads' };

export default async function AdmissionLeadsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/admin/login');

  const leads = await prisma.admissionLead.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      mobile: true,
      programme: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Admission Leads
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enquiries from the homepage popup. {leads.length} lead
            {leads.length === 1 ? '' : 's'}. Edit the form itself under{' '}
            <a href="/admin/admission-lead-popup" className="text-accent hover:underline">
              Admission Lead Popup
            </a>
            .
          </p>
        </div>

        {leads.length > 0 && (
          // A plain link, not fetch(): letting the browser navigate is
          // what makes the Content-Disposition header trigger a save.
          <a
            href="/api/admin/admission-leads/export"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <Download size={16} />
            Export CSV
          </a>
        )}
      </header>

      <LeadsList
        items={leads.map((l) => ({
          id: l.id,
          fullName: l.fullName,
          mobile: l.mobile,
          programme: l.programme,
          status: l.status,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
