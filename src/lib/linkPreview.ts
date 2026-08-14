// Shared link-preview logic used by both the live composer preview and the
// save route, so a pasted link and the saved item resolve the same image/title.

import { safeFetch } from "@/lib/safeFetch";

export interface LinkPreview {
  kind: "image" | "video" | "link";
  imageUrl: string | null;
  title: string | null;
  description?: string | null;
  videoUrl?: string | null;
  embedUrl?: string | null;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function ytId(url: string): string | null {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/)?.[1] || null;
}
function vimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || null;
}

/** Upsize Pinterest thumbnails (…/736x/…) to full-res "originals". */
function upsizePinterest(u: string): string {
  let host = "";
  try {
    host = new URL(u).hostname.toLowerCase();
  } catch {
    return u;
  }
  return host === "i.pinimg.com" ? u.replace(/\/(?:\d+x|\d+x\d+)\//, "/originals/") : u;
}

export async function getLinkPreview(url: string): Promise<LinkPreview> {
  if (!url || typeof url !== "string") return { kind: "link", imageUrl: null, title: null };

  // Direct image / video files.
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url)) {
    return { kind: "image", imageUrl: url, title: null, embedUrl: null };
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return { kind: "video", videoUrl: url, imageUrl: null, title: null, embedUrl: null };
  }

  // Known video platforms → embeddable player + thumbnail.
  const yt = ytId(url);
  if (yt) {
    return {
      kind: "video",
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      imageUrl: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      title: null,
    };
  }
  const vim = vimeoId(url);
  if (vim) {
    return { kind: "video", embedUrl: `https://player.vimeo.com/video/${vim}`, imageUrl: null, title: null };
  }

  // Otherwise scrape OG/Twitter tags. Browser UA + follow redirects so short
  // links (pin.it → api.pinterest → /pin/NNN) resolve to the real page.
  try {
    const res = await safeFetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { kind: "link", imageUrl: null, title: null };
    const html = await res.text();

    const metas = html.match(/<meta\b[^>]*>/gi) || [];
    const attr = (tag: string, a: string) =>
      tag.match(new RegExp(`\\b${a}=["']([^"']*)["']`, "i"))?.[1] || null;
    const metaContent = (...keys: string[]): string | null => {
      for (const tag of metas) {
        const key = (attr(tag, "property") || attr(tag, "name") || "").toLowerCase();
        if (keys.includes(key)) {
          const c = attr(tag, "content");
          if (c) return c;
        }
      }
      return null;
    };

    let imageUrl = metaContent("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src");
    if (imageUrl) imageUrl = upsizePinterest(imageUrl);
    const title =
      metaContent("og:title", "twitter:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null;
    const description = metaContent("og:description", "twitter:description");
    const ogVideo = metaContent("og:video", "og:video:url", "og:video:secure_url");

    return {
      kind: ogVideo ? "video" : imageUrl ? "image" : "link",
      imageUrl,
      title,
      description,
      embedUrl: ogVideo,
    };
  } catch {
    return { kind: "link", imageUrl: null, title: null };
  }
}
