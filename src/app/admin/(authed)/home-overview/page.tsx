import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import HomeOverviewForm from './HomeOverviewForm';

export const metadata = { title: 'Home Overview' };

export default async function HomeOverviewAdminPage() {
  const session = await getSession();
  if (!session?.user) redirect('/admin/login');

  const row = await prisma.homeOverview.findUnique({ where: { id: 'singleton' } });

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-display font-bold text-gray-900">Home Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          The department introduction on the homepage, between the hero slider
          and the programs list. Heading, body copy, image, and the two buttons
          below it.
        </p>
      </header>
      <HomeOverviewForm initial={row} />
    </div>
  );
}
