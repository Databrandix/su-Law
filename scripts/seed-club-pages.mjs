/**
 * Fill in detail-page content for the two Law societies, so each gets
 * its own page at /student-society/club-list/<slug>.
 *
 * Everything is transcribed from the department's spreadsheet
 * "Student_Societies_and_CoCurricular_Template-1":
 *   · sheet "Societies_Clubs"   → purpose, advisor, president, contacts
 *   · sheet "Activities_Events" → the activities grid
 *   · sheet "Achievements"      → the debate runner-up result
 *
 * The 13 university-wide clubs are left untouched: with no introHeading
 * they stay card-only, exactly as before.
 *
 * Images are the club's existing placeholder until real photos are
 * uploaded at /admin/clubs.
 *
 * Dry-run by default. Pass --commit to write.
 *
 *   node --env-file=.env scripts/seed-club-pages.mjs
 *   node --env-file=.env scripts/seed-club-pages.mjs --commit
 */
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');
const prisma = new PrismaClient();

const PAGES = {
  'moot-court-society': {
    heroOverline: 'Student Society',
    introOverline: 'About the Society',
    introHeading: 'Advocacy, research and <span class="text-gradient">professional ethics</span>',
    introBody1:
      'The Sonargaon University Moot Court Society promotes excellence in legal advocacy, research, writing, and professional ethics among law students. It organises training programmes, workshops, seminars, mock trials, and moot court competitions, and prepares students for national and international advocacy competitions.',
    introBody2:
      'Founded in 2019, the Society is committed to fostering advocacy, legal research, ethical professionalism, and leadership among law students while promoting excellence in practical legal education and the rule of law.',
    // Activity figures, matching how the Business Club page reads
    // ("80+ Active Members · 30+ Field Visits"). Every number is drawn
    // from the Activities_Events sheet — participant counts summed
    // across the Society's two recorded events — so nothing here is
    // invented. Founded year and status live in the intro copy rather
    // than taking a stat tile.
    stats: [
      { value: '7', label: 'Annual Moots Held' },
      { value: '148+', label: 'Participants Trained' },
      { value: '2', label: 'Competitions Hosted' },
      { value: '6', label: 'Years Active' },
    ],
    activitiesOverline: 'What We Do',
    activitiesHeading: 'Competitions & Training',
    activities: [
      {
        iconName: 'Gavel',
        imageUrl: '',
        imagePublicId: null,
        category: 'Workshop & Competition',
        title: '7th SUMCS Moot Court Competition 2025',
        description:
          'An intra-university moot court competition held to enhance advocacy, legal research, legal writing, and courtroom presentation skills. 48 participants took part at Sonargaon University.',
      },
      {
        iconName: 'Mic',
        imageUrl: '',
        imagePublicId: null,
        category: 'Competition',
        title: 'Public Speaking Competition 2026',
        description:
          'A platform for students to develop public speaking, critical thinking, and persuasive communication. Participants presented on contemporary legal and social issues before a panel of judges. Around 100 participants.',
      },
    ],
    networkOverline: 'Get Involved',
    networkHeading: 'Join the Moot Court Society',
    networkBody:
      'Advisor: Md. Sagor Hossain, Assistant Professor of Law · President: Moriom Akhter Meem. Write to us or follow the Society for competition announcements, training schedules, and workshop details.',
    networkPrimaryCtaLabel: 'Email the Society',
    networkPrimaryCtaHref: 'mailto:sumcs.law.su@gmail.com',
    networkSecondaryCtaLabel: 'Follow on Facebook',
    networkSecondaryCtaHref: 'https://www.facebook.com/share/1bhSgdigjK/?mibextid=wwXIfr',
  },

  'law-club': {
    heroOverline: 'Student Society',
    introOverline: 'About the Club',
    introHeading: 'Legal knowledge and <span class="text-gradient">professional development</span>',
    introBody1:
      'The Sonargaon University Law Club is established to promote legal knowledge, academic excellence, and professional development among students. It aims to enhance legal research, writing, advocacy, and leadership skills through seminars, workshops, debates, legal awareness programmes, and moot court activities.',
    introBody2:
      'Founded in 2025, the Club strives through academic, co-curricular, and community engagement activities to develop competent, responsible, and socially aware law graduates grounded in ethical values.',
    stats: [
      { value: '2', label: 'Seminars Hosted' },
      { value: '180+', label: 'Students Reached' },
      { value: '1', label: 'Award Won' },
      { value: 'All', label: 'Faculty Advisors' },
    ],
    activitiesOverline: 'What We Do',
    activitiesHeading: 'Seminars & Career Events',
    activities: [
      {
        iconName: 'Briefcase',
        imageUrl: '',
        imagePublicId: null,
        category: 'Seminar',
        title: 'Career Prospect of Law Graduates',
        description:
          'A seminar on evolving pathways, professional challenges, and emerging opportunities for law graduates in both traditional and emerging legal fields. Around 100 attendees.',
      },
      {
        iconName: 'Receipt',
        imageUrl: '',
        imagePublicId: null,
        category: 'Seminar',
        title: 'Tax Law as a Profession',
        description:
          'A seminar on opportunities, trends, and current developments in tax law — covering recent tax legislation, compliance, digital transformation, and career paths in taxation. Around 80 attendees.',
      },
      {
        iconName: 'Trophy',
        imageUrl: '',
        imagePublicId: null,
        category: 'Achievement',
        title: 'Runner-Up — Debate Competition 2026',
        description:
          'LL.B. 31st batch students Pritom Mahmud Shishir, Ahnaf Habib, and Yuvraj Paul finished runner-up in the inter-department debate competition organised by the Sonargaon University Debating Society.',
      },
    ],
    networkOverline: 'Get Involved',
    networkHeading: 'Join the Law Club',
    networkBody:
      'Advisors: all faculty members of the Department of Law · President: Kazi Abu Bokkor Jony. Write to us or follow the Club for seminar announcements, debates, and legal awareness programmes.',
    networkPrimaryCtaLabel: 'Email the Club',
    networkPrimaryCtaHref: 'mailto:su.lawclub2015@gmail.com',
    networkSecondaryCtaLabel: 'Follow on Facebook',
    networkSecondaryCtaHref: 'https://www.facebook.com/share/1DFEsKRdD3/?mibextid=wwXIfr',
  },
};

try {
  console.log(COMMIT ? '=== COMMIT ===\n' : '=== DRY RUN (pass --commit to write) ===\n');

  for (const [slug, page] of Object.entries(PAGES)) {
    const club = await prisma.club.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!club) {
      console.log(`!! no club with slug "${slug}" — skipped`);
      continue;
    }

    console.log(`${club.name}`);
    console.log(`  /student-society/club-list/${slug}`);
    console.log(`  stats      : ${page.stats.map((s) => `${s.value} ${s.label}`).join(' · ')}`);
    console.log(`  activities : ${page.activities.length}`);
    for (const a of page.activities) console.log(`      · [${a.category}] ${a.title}`);
    console.log(`  CTAs       : ${page.networkPrimaryCtaLabel} · ${page.networkSecondaryCtaLabel}\n`);

    if (COMMIT) {
      await prisma.club.update({ where: { id: club.id }, data: page });
    }
  }

  if (COMMIT) {
    const withPages = await prisma.club.count({ where: { introHeading: { not: null } } });
    const total = await prisma.club.count();
    console.log(`Saved. ${withPages} of ${total} clubs now have a detail page.`);
  }
} finally {
  await prisma.$disconnect();
}
