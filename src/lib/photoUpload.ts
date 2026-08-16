import { MAX_IMAGE_BYTES, dataUrlBytes } from "./photo";

/**
 * Turns a file the user picked into a data URL small enough to store in a row.
 * Browser-only — it draws through a canvas.
 *
 * A phone photo is several megabytes and far larger than anything the app
 * displays, so it gets scaled to fit MAX_EDGE and re-encoded as JPEG. That
 * usually lands in the low hundreds of KB.
 */

const MAX_EDGE = 1280;
const QUALITY = 0.82;

/** Progressively harder re-encodes, in case the first pass is still too big. */
const FALLBACK_ATTEMPTS = [
  { edge: 1024, quality: 0.75 },
  { edge: 800, quality: 0.7 },
];

export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image.");
  }

  const source = await loadImage(file);
  try {
    for (const { edge, quality } of [{ edge: MAX_EDGE, quality: QUALITY }, ...FALLBACK_ATTEMPTS]) {
      const dataUrl = draw(source, edge, quality);
      if (dataUrlBytes(dataUrl) <= MAX_IMAGE_BYTES) return dataUrl;
    }
  } finally {
    if (source instanceof ImageBitmap) source.close();
  }

  throw new Error("That photo is too large even after resizing — try a smaller one.");
}

/** Scales the image so its longest edge is at most `edge`, then JPEG-encodes it. */
function draw(source: ImageBitmap | HTMLImageElement, edge: number, quality: number): string {
  const sw = source instanceof ImageBitmap ? source.width : source.naturalWidth;
  const sh = source instanceof ImageBitmap ? source.height : source.naturalHeight;
  const scale = Math.min(1, edge / Math.max(sw, sh));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read that image.");
  // JPEG has no alpha channel, so fill first or a transparent PNG comes out black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // from-image so a photo taken sideways doesn't get stored sideways.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some browsers reject the options bag; fall back to an <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.src = url;
    });
    return img;
  } finally {
    // Safe to release once decoded — the element keeps the pixels.
    URL.revokeObjectURL(url);
  }
}
