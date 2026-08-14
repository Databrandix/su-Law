import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth-server';

// Leads contain personal contact details, so this is behind the same
// session check the admin pages use — never expose it unauthenticated.
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const leads = await prisma.admissionLead.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      fullName: true,
      mobile: true,
      programme: true,
      status: true,
      createdAt: true,
    },
  });

  const header = ['Name', 'Mobile', 'Programme', 'Status', 'Submitted at'];
  const rows = leads.map((l) => [
    l.fullName,
    l.mobile,
    l.programme,
    l.status,
    l.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

  // BOM so Excel opens UTF-8 correctly — without it Bengali names and
  // any non-ASCII characters render as mojibake on a default install.
  const body = `﻿${csv}`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="admission-leads-${stamp}.csv"`,
      // These are personal details; keep them out of any shared cache.
      'Cache-Control': 'no-store',
    },
  });
}

function csvCell(value: string): string {
  // A cell opening with =, +, - or @ is executed as a formula by Excel
  // and Sheets. Names and programmes are attacker-influenced (they come
  // from a public form), so neutralise the cell with a leading
  // apostrophe before quoting it.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}
