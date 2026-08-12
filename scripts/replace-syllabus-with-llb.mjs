/**
 * Replaces the syllabus list with the single LL.B (Honours) syllabus.
 *
 * The eight existing rows are Business-Administration leftovers from the
 * template, all pointing at the OLD BA Cloudinary account
 * (n3n2tgqk/bba-dept/…). Nothing in them belongs to Law, so they go.
 *
 * ORDER MATTERS: the PDF is uploaded to the Law Cloudinary account and
 * its delivery URL is fetched back over HTTP *before* a single row is
 * deleted. If the upload fails, or the uploaded file does not actually
 * serve, the script aborts with the old rows still intact — losing the
 * old list and gaining nothing is the one outcome worth engineering
 * against.
 *
 * The remote BA assets are deliberately NOT deleted: they live in a
 * different Cloudinary account this project has no credentials for, and
 * that account still backs the live BA department site.
 *
 * Dry run by default; pass --commit to write.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

const PDF_PATH =
  'C:/Users/Nabid Ahamed Noushad/Downloads/Detail Syllabus of LLB (Honours) 4 year_12  Semester(1)(2)(1).doc.pdf';

// The row that replaces all eight. Department/level match the existing
// LL.B programme record; the title is the department's own wording.
const ROW = {
  slug: 'llb-honours',
  title: 'Bachelor of Laws — LL.B (Honours)',
  shortTitle: 'LL.B (Honours)',
  department: 'Law',
  level: 'Undergraduate',
  // The uploaded file is named "...4 year_12  Semester...", but that
  // filename is wrong: the PDF's own cover page states no semester
  // count, and the curriculum lists eight (1st Year 1st Semester …
  // 4th Year 2nd Semester). Program.duration agrees. Do not copy the
  // figure back out of the filename.
  pdfFileName: 'Detail Syllabus of LLB (Honours) 4 Year 8 Semester',
  summary:
    'Detailed course-by-course syllabus for the LL.B (Honours) programme (4 Years · 8 Semesters).',
  displayOrder: 0,
};

// ─── env ────────────────────────────────────────────────────────────
function readEnv() {
  const raw = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
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
const FOLDER = `${env.CLOUDINARY_UPLOAD_FOLDER || 'phase-0'}/syllabus/pdfs`;

// ─── preflight ──────────────────────────────────────────────────────
if (!fs.existsSync(PDF_PATH)) {
  console.error(`Source PDF not found:\n  ${PDF_PATH}`);
  process.exit(1);
}
const bytes = fs.readFileSync(PDF_PATH);
if (bytes.subarray(0, 4).toString('latin1') !== '%PDF') {
  console.error('Source file is not a PDF (missing %PDF header). Aborting.');
  process.exit(1);
}

const prisma = new PrismaClient();
const existing = await prisma.syllabus.findMany({ orderBy: { displayOrder: 'asc' } });

console.log(`Source PDF : ${path.basename(PDF_PATH)}`);
console.log(`             ${(bytes.length / 1024).toFixed(0)} KB`);
console.log(`Target     : ${env.CLOUDINARY_CLOUD_NAME}/${FOLDER}\n`);

console.log(`Existing rows to DELETE (${existing.length}):`);
for (const s of existing) console.log(`  − ${s.slug.padEnd(32)} ${s.title}`);
console.log(`\nRow to CREATE:`);
console.log(`  + ${ROW.slug.padEnd(32)} ${ROW.title}`);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

// ─── 1. upload (before any delete) ──────────────────────────────────
console.log('\nUploading to Cloudinary…');
const timestamp = Math.round(Date.now() / 1000);

// Signature covers exactly the params sent, sorted by key — Cloudinary
// rejects any mismatch, so this must stay in step with the form below.
const toSign = { folder: FOLDER, timestamp };
const signature = crypto
  .createHash('sha1')
  .update(
    Object.keys(toSign)
      .sort()
      .map((k) => `${k}=${toSign[k]}`)
      .join('&') + env.CLOUDINARY_API_SECRET,
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
  console.error('Upload FAILED — no rows touched.');
  console.error(JSON.stringify(up, null, 2));
  await prisma.$disconnect();
  process.exit(1);
}
console.log(`  uploaded: ${up.secure_url}`);
console.log(`  publicId: ${up.public_id}  (${up.format}, ${up.resource_type})`);

// ─── 2. verify it actually serves ───────────────────────────────────
// A 200 from the upload API only means Cloudinary stored the bytes.
// Delivery is a separate concern: free accounts block PDF delivery by
// default, which returns 401 at this step. Better to find out now,
// while the old rows are still there, than after deleting them.
const check = await fetch(up.secure_url, { method: 'GET', headers: { Range: 'bytes=0-99' } });
console.log(`  delivery: HTTP ${check.status}`);
if (!check.ok) {
  console.error(
    '\nUploaded, but the file does not serve (see status above).',
    '\nNo rows were deleted. If this is 401, enable "PDF and ZIP files delivery"',
    '\nat https://console.cloudinary.com/settings/security and re-run.',
  );
  await prisma.$disconnect();
  process.exit(1);
}

// ─── 3. swap the rows ───────────────────────────────────────────────
const result = await prisma.$transaction(async (tx) => {
  const { count } = await tx.syllabus.deleteMany({});
  const created = await tx.syllabus.create({
    data: { ...ROW, pdfUrl: up.secure_url, pdfPublicId: up.public_id },
  });
  return { count, created };
});

console.log(`\ndeleted ${result.count} row(s); created "${result.created.slug}".`);
await prisma.$disconnect();
