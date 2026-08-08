import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import AboutDepartmentLayoutForm from './AboutDepartmentLayoutForm';

export const metadata = { title: 'About — Department Layout' };

export default async function AboutDepartmentLayoutPage() {
  const session = await getSession();
  if (!session?.user) redirect('/admin/login');

  const row = await prisma.aboutDepartmentLayout.findUnique({
    where: { id: 'singleton' },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          About — Department Layout
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Hero + downloadable layout card for{' '}
          <code className="font-mono">/about/department-layout</code>.
        </p>
      </header>
      <AboutDepartmentLayoutForm initial={row} />
    </div>
  );
}
