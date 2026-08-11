/**
 * Populates the Service Charter page.
 *
 * SOURCES
 *   Service-Charter-…docx  — office directory (22 offices + levels)
 *   Service-Charter.pdf    — the same directory, for View / Download
 *
 * The DOCX was parsed and compared row-by-row against the offices
 * already stored on AboutDepartmentLayout: identical names, levels and
 * order, all 22. So the office list is READ from that existing record
 * rather than re-imported here — one stored copy, no chance of the two
 * pages drifting apart.
 *
 * This script therefore only uploads the PDF and stores its URL.
 *
 * Dry run by default; pass --commit to write.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

const PDF_PATH = 'C:/Users/Nabid Ahamed Noushad/Downloads/Service-Charter.pdf';
const KEY = 'service-charter';

function readEnv() {
  const raw = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv();
for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  if (!env[k]) {
    console.error(`${k} missing from .env — cannot upload.`);
    process.exit(1);
  }
}
const FOLDER = `${env.CLOUDINARY_UPLOAD_FOLDER || 'phase-0'}/student-society/service-charter`;

if (!fs.existsSync(PDF_PATH)) {
  console.error(`Source PDF not found:\n  ${PDF_PATH}`);
  process.exit(1);
}
const bytes = fs.readFileSync(PDF_PATH);
if (bytes.subarray(0, 4).toString('latin1') !== '%PDF') {
  console.error('Source file is not a PDF. Aborting.');
  process.exit(1);
}

const prisma = new PrismaClient();

// Guard: the page renders the offices from this record, so refuse to
// proceed if it is missing or has been emptied.
const layout = await prisma.aboutDepartmentLayout.findUnique({
  where: { id: 'singleton' },
  select: { offices: true, deptName: true, address: true },
});
const officeCount = Array.isArray(layout?.offices) ? layout.offices.length : 0;
if (officeCount === 0) {
  console.error('AboutDepartmentLayout has no offices — the page would render empty. Aborting.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`Source PDF   : ${path.basename(PDF_PATH)} (${(bytes.length / 1024).toFixed(0)} KB)`);
console.log(`Target       : ${env.CLOUDINARY_CLOUD_NAME}/${FOLDER}`);
console.log(`Offices (from AboutDepartmentLayout, reused): ${officeCount}`);
console.log(`Dept / addr  : ${layout.deptName} — ${layout.address}`);

const existing = await prisma.serviceCharter.findUnique({ where: { id: 'singleton' } });
console.log(`\nServiceCharter row  : ${existing ? 'exists (will update)' : 'not set (will create)'}`);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

console.log('\nUploading to Cloudinary…');
const timestamp = Math.round(Date.now() / 1000);
const toSign = { folder: FOLDER, timestamp };
const signature = crypto
  .createHash('sha1')
  .update(
    Object.keys(toSign).sort().map((k) => `${k}=${toSign[k]}`).join('&') +
      env.CLOUDINARY_API_SECRET,
  )
  .digest('hex');

const form = new FormData();
form.append('file', new Blob([bytes], { type: 'application/pdf' }), path.basename(PDF_PATH));
form.append('api_key', env.CLOUDINARY_API_KEY);
form.append('timestamp', String(timestamp));
form.append('folder', FOLDER);
form.append('signature', signature);

const res = await fetch(
  `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
  { method: 'POST', body: form },
);
const up = await res.json();
if (!res.ok || !up.secure_url) {
  console.error('Upload FAILED — nothing written.');
  console.error(JSON.stringify(up, null, 2));
  await prisma.$disconnect();
  process.exit(1);
}
console.log(`  uploaded: ${up.secure_url}`);

const check = await fetch(up.secure_url, { method: 'GET', headers: { Range: 'bytes=0-99' } });
console.log(`  delivery: HTTP ${check.status}`);
if (!check.ok) {
  console.error('\nUploaded but does not serve. Nothing written.');
  await prisma.$disconnect();
  process.exit(1);
}

const pdf = {
  pdfUrl: up.secure_url,
  pdfPublicId: up.public_id,
  pdfFileName: 'Service Charter — Department of Law',
};
await prisma.serviceCharter.upsert({
  where: { id: 'singleton' },
  update: pdf,
  create: {
    id: 'singleton',
    heroTitle: 'Service Charter',
    heroOverline: 'Student',
    // Same hero the placeholder page used, so the page keeps its look.
    heroImageUrl: '/assets/syllabus-hero.webp',
    cardTitle: 'Service Charter',
    ...pdf,
  },
});

console.log('\nstored ServiceCharter singleton.');
await prisma.$disconnect();
