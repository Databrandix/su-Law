/**
 * Fetch every ResearchPaper.link and report its HTTP status, so a
 * mistyped DOI shows up here rather than as a dead link on /research.
 * Read-only.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const rows = await prisma.researchPaper.findMany({
    where: { link: { not: null } },
    orderBy: { displayOrder: 'asc' },
    select: { displayOrder: true, title: true, authors: true, link: true },
  });
  console.log(`checking ${rows.length} links…\n`);
  let bad = 0;
  for (const r of rows) {
    let status = 'ERR';
    try {
      const res = await fetch(r.link, { redirect: 'follow', signal: AbortSignal.timeout(25000) });
      status = String(res.status);
    } catch { status = 'timeout/err'; }
    const ok = status === '200';
    if (!ok) bad++;
    console.log(`${ok ? ' ok ' : 'FAIL'}  ${status.padEnd(12)} ${r.link}`);
    if (!ok) console.log(`        ↳ [${r.displayOrder}] ${r.authors} — ${r.title.slice(0, 80)}`);
  }
  console.log(`\n${bad === 0 ? 'All links resolve.' : `${bad} link(s) need attention.`}`);
} finally {
  await prisma.$disconnect();
}
