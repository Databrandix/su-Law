/**
 * Browser-side image downscaling, applied before an upload leaves the
 * admin UI.
 *
 * Cameras produce 6000×4000 / ~12 MB JPEGs, which are both far larger
 * than any layout needs and over Cloudinary's 10 MB per-file limit —
 * uploads failed with "File size too large". Downscaling in the browser
 * fixes that at the source, so admins never have to resize by hand.
 *
 * Mirrors the sharp settings used to convert the first batch of camera
 * photos: longest edge 2000 px, WebP quality 0.82. That lands a typical
 * 12 MB camera JPEG at ~200 KB with no visible loss at display sizes.
 */

/** Longest-edge cap. 2000 px stays crisp on 2× displays at full width. */
const MAX_EDGE = 2000;

/** WebP quality. 0.82 matches the sharp `quality: 82` used previously. */
const QUALITY = 0.82;

/**
 * Only compress when it's worth it. Small files are already web-sized,
 * and re-encoding them just costs quality for no benefit.
 */
const MIN_BYTES = 1_024 * 1_024; // 1 MB

/**
 * Formats we re-encode. GIFs are excluded because canvas flattens
 * animation to a single frame, and SVGs because rasterizing destroys
 * them — both pass through untouched.
 */
const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', QUALITY);
  });
}

/**
 * Downscale + re-encode `file` to WebP when it is a large raster image.
 *
 * Returns the original File unchanged when compression doesn't apply
 * (PDF, small file, animated/vector format) or when it wouldn't help
 * (result came out no smaller). Never throws — on any decode/encode
 * failure the original is returned so the upload still proceeds and
 * Cloudinary's own error reporting stays the single source of truth.
 */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type)) return file;
  if (file.size < MIN_BYTES) return file;

  try {
    const img = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return file;

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas);
    // Keep the original if re-encoding didn't actually shrink it —
    // can happen with already-optimized WebP source files.
    if (!blob || blob.size >= file.size) return file;

    const nextName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], nextName, {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/** Human-readable byte size for toasts, e.g. "12.7 MB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
