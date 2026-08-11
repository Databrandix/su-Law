/**
 * Adds the LL.M (1 Year) syllabus alongside the existing LL.B row.
 *
 * ADDITIVE, unlike replace-syllabus-with-llb.mjs: nothing is deleted.
 * The script aborts if the slug already exists rather than overwriting,
 * so re-running it cannot silently clobber a row.
 *
 * Wording is taken from the programme record (programName "Master of
 * Laws", degreeCode "LL.M", duration "1 Year · 2 Semesters") so the
 * syllabus card cannot drift from the programme page.
 *
 * As with the LL.B import, the PDF is uploaded and its delivery URL is
 * fetched back over HTTP before the row is written — a row pointing at
 * a file that does not serve is worse than no row.
 *
 * Dry run by default; pass --commit to write.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const COMMIT = process.argv.includes('--commit');

const PDF_PATH =
  'C:/Users/Nabid Ahamed Noushad/Downloads/LLM(1Year) bi semester syllabus.docx.pdf';

const SLUG = 'llm';
const PROGRAM_SLUG = 'llm';

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

const clash = await prisma.syllabus.findUnique({ where: { slug: SLUG } });
if (clash) {
  console.error(`A syllabus with slug "${SLUG}" already exists ("${clash.title}").`);
  console.error('Refusing to overwrite. Delete it first if you meant to replace it.');
  await prisma.$disconnect();
  process.exit(1);
}

// Title the row from the programme record rather than the filename.
const program = await prisma.program.findUnique({
  where: { slug: PROGRAM_SLUG },
  select: { programName: true, degreeCode: true, duration: true },
});
if (!program) {
  console.error(`No program with slug "${PROGRAM_SLUG}" — cannot derive the title.`);
  await prisma.$disconnect();
  process.exit(1);
}

const ROW = {
  slug: SLUG,
  title: `${program.programName} — ${program.degreeCode}`,
  shortTitle: program.degreeCode,
  department: 'Law',
  level: 'Postgraduate',
  pdfFileName: 'LLM (1 Year) Bi-Semester Syllabus',
  summary: `Detailed course-by-course syllabus for the ${program.degreeCode} programme (${program.duration}).`,
};

// Append after the existing rows instead of fighting over displayOrder 0.
const last = await prisma.syllabus.findFirst({
  orderBy: { displayOrder: 'desc' },
  select: { displayOrder: true },
});
const displayOrder = (last?.displayOrder ?? -1) + 1;

const existing = await prisma.syllabus.findMany({
  orderBy: { displayOrder: 'asc' },
  select: { slug: true, title: true },
});

console.log(`Source PDF : ${path.basename(PDF_PATH)}`);
console.log(`             ${(bytes.length / 1024).toFixed(0)} KB`);
console.log(`Target     : ${env.CLOUDINARY_CLOUD_NAME}/${FOLDER}\n`);
console.log(`Existing rows (kept, ${existing.length}):`);
for (const s of existing) console.log(`    ${s.slug.padEnd(16)} ${s.title}`);
console.log(`\nRow to CREATE:`);
console.log(`  + ${ROW.slug.padEnd(16)} ${ROW.title}`);
console.log(`    level        ${ROW.level}`);
console.log(`    summary      ${ROW.summary}`);
console.log(`    displayOrder ${displayOrder}`);

if (!COMMIT) {
  console.log('\ndry run — pass --commit to apply.');
  await prisma.$disconnect();
  process.exit(0);
}

// ─── upload ─────────────────────────────────────────────────────────
console.log('\nUploading to Cloudinary…');
const timestamp = Math.round(Date.now() / 1000);
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
  console.error('Upload FAILED — no row written.');
  console.error(JSON.stringify(up, null, 2));
  await prisma.$disconnect();
  process.exit(1);
}
console.log(`  uploaded: ${up.secure_url}`);
console.log(`  publicId: ${up.public_id}  (${up.format}, ${up.resource_type})`);

// ─── verify delivery before writing the row ─────────────────────────
const check = await fetch(up.secure_url, { method: 'GET', headers: { Range: 'bytes=0-99' } });
console.log(`  delivery: HTTP ${check.status}`);
if (!check.ok) {
  console.error('\nUploaded, but the file does not serve. No row written.');
  await prisma.$disconnect();
  process.exit(1);
}

const created = await prisma.syllabus.create({
  data: { ...ROW, displayOrder, pdfUrl: up.secure_url, pdfPublicId: up.public_id },
});
console.log(`\ncreated "${created.slug}" (${created.level}).`);
await prisma.$disconnect();
