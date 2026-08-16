/**
 * Rules for a stored photo, shared by the browser and the API.
 *
 * There's no blob store, so an uploaded photo is downscaled in the browser and
 * kept inline as a data URL in the row's imageUrl column. That makes the size
 * cap a correctness concern rather than a nicety: the client compresses to fit,
 * and the API enforces the same ceiling so a hand-rolled request can't drop a
 * multi-megabyte string into the database.
 */

/** Largest decoded image we'll store, in bytes. */
export const MAX_IMAGE_BYTES = 1_500_000;

/** Longest plain http(s) link we'll store. */
const MAX_LINK_CHARS = 2048;

const DATA_URL_PREFIX = /^data:image\/(png|jpeg|webp|gif);base64,/;

/**
 * Decoded size of a base64 data URL. Base64 carries three bytes per four
 * characters, minus however many `=` pad characters are on the end.
 */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * Checks a photo value that's about to be stored, whether it came from an
 * upload or a pasted link. Returns a message to show the user, or null if it's
 * fine. Empty and absent both count as "no photo", which is allowed.
 */
export function validateStoredImage(imageUrl: unknown): string | null {
  if (imageUrl === null || imageUrl === undefined || imageUrl === "") return null;
  if (typeof imageUrl !== "string") return "Photo must be a link or an uploaded image.";

  if (imageUrl.startsWith("data:")) {
    if (!DATA_URL_PREFIX.test(imageUrl)) {
      return "That image format isn't supported — use a PNG, JPEG, WebP, or GIF.";
    }
    if (dataUrlBytes(imageUrl) > MAX_IMAGE_BYTES) {
      return `That photo is too large — keep it under ${Math.round(MAX_IMAGE_BYTES / 100_000) / 10} MB.`;
    }
    return null;
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    return "A photo link has to start with http:// or https://";
  }
  if (imageUrl.length > MAX_LINK_CHARS) return "That photo link is too long.";
  return null;
}
