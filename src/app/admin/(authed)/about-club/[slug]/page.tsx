import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import ClubDetailForm from './ClubDetailForm';

export const metadata = { title: 'About — Club page' };

export default async function AboutClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/admin/login');

  const { slug } = await params;
  const club = await prisma.club.findUnique({ where: { slug } });
  if (!club) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          About — {club.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Hero, intro, figures, activities, and closing panel for{' '}
          <code className="font-mono">/student-society/club-list/{club.slug}</code>.
          The club&apos;s name, card description, and cover image are edited
          under <span className="font-medium">Student Society → Clubs</span>.
        </p>
      </header>
      <ClubDetailForm club={club} />
    </div>
  );
}
