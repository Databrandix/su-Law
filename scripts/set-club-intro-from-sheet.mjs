/**
 * Replaces the two societies' intro paragraphs with the verbatim text
 * from Student_Societies_and_CoCurricular_Template-1, sheet 1.
 *
 * The seeded copy paraphrased the source: it changed the sheet's
 * "shall aim to promote" into "promotes", dropped the tail of the
 * objectives list, and folded the founding year into the prose. This
 * restores the sheet's own wording so the page can be checked against
 * the document it came from.
 *
 * Cell references (sheet 1 = the society register):
 *   introBody1  <- column D, "Purpose & Objectives"
 *   introBody2  <- column L, "Remarks"
 *   SUMCS = row 2, SULC = row 3
 *
 * The only edit to either cell is the leading list number in D3/L3's
 * club name, which the sheet carries in column A; nothing is added.
 *
 * Dry run by default; pass --commit to write.
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

const COPY = {
  'moot-court-society': {
    // sheet1!D2 — Purpose & Objectives
    introBody1:
      'The Moot Court Society shall aim to promote excellence in legal advocacy, research, writing, and professional ethics among law students. It shall organise training programmes, workshops, seminars, mock trials, and moot court competitions; prepare students for national and international advocacy competitions; foster leadership, teamwork, and analytical skills; encourage legal scholarship and practical legal education; facilitate interaction with members of the judiciary, legal profession, and academia; and contribute to the advancement of legal education and the rule of law.',
    // sheet1!L2 — Remarks
    introBody2:
      'The Sonargaon University Moot Court Society is committed to fostering advocacy, legal research, ethical professionalism, and leadership among law students while promoting excellence in practical legal education and the rule of law.',
  },
  'law-club': {
    // sheet1!D3 — Purpose & Objectives
    introBody1:
      'The Sonargaon University Law Club (SULC) is established to promote legal knowledge, academic excellence, and professional development among students. It aims to enhance legal research, writing, advocacy, and leadership skills through seminars, workshops, debates, legal awareness programmes, moot courts, and other co-curricular activities. The Club also seeks to foster ethical values, teamwork, community engagement, and respect for the rule of law while encouraging students to contribute positively to society and the legal profession.',
    // sheet1!L3 — Remarks
    introBody2:
      'The Sonargaon University Law Club (SULC) is committed to promoting legal knowledge, academic excellence, ethical values, and professional development among students. Through academic, co-curricular, and community engagement activities, the Club strives to develop competent, responsible, and socially conscious future legal professionals dedicated to upholding justice and the rule of law.',
  },
};

const p = new PrismaClient();

for (const [slug, copy] of Object.entries(COPY)) {
  const club = await p.club.findUnique({
    where: { slug },
    select: { name: true, introBody1: true, introBody2: true },
  });
  if (!club) {
    console.log(`${slug}: NOT FOUND`);
    continue;
  }

  console.log(`\n${'='.repeat(68)}\n${club.name}\n${'='.repeat(68)}`);
  for (const field of ['introBody1', 'introBody2']) {
    const changed = club[field] !== copy[field];
    console.log(`\n${field} ${changed ? '(CHANGED)' : '(already matches)'}`);
    if (changed) {
      console.log(`  was: ${club[field]}`);
      console.log(`  now: ${copy[field]}`);
    }
  }

  if (COMMIT) await p.club.update({ where: { slug }, data: copy });
}

console.log(COMMIT ? '\nwritten.' : '\ndry run — pass --commit to apply.');
await p.$disconnect();
