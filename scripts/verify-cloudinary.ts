/* One-shot Cloudinary credentials verifier.
 *
 *   npx tsx scripts/verify-cloudinary.ts
 *
 * Calls cloudinary.api.ping() — a low-cost endpoint that confirms
 * cloud_name + api_key + api_secret all parse and authenticate.
 * Does not upload anything.
 */
import { v2 as cloudinary } from 'cloudinary';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

cloudinary.config({
  cloud_name: required('CLOUDINARY_CLOUD_NAME'),
  api_key:    required('CLOUDINARY_API_KEY'),
  api_secret: required('CLOUDINARY_API_SECRET'),
  secure: true,
});

async function main() {
  console.log(`Cloud name : ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`API key    : ${process.env.CLOUDINARY_API_KEY?.slice(0, 6)}…`);
  console.log(`Upload folder (write-target): ${process.env.CLOUDINARY_UPLOAD_FOLDER ?? '(not set)'}`);
  console.log('');

  const res = await cloudinary.api.ping();
  console.log('✓ Cloudinary ping OK:', res);
}

main().catch((e) => {
  console.error('✗ Cloudinary ping FAILED:', e?.message ?? e);
  process.exit(1);
});
