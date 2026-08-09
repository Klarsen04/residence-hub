import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Live link preview for the inspiration composer (Pinterest-style): given a URL,
// return its OG image/title/description + a detected media kind so the UI can
// show a thumbnail, a playable video embed, or a plain link card before saving.

function ytId(url: string): string | null {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/)?.[1] || null;
}
function vimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  // Direct image or video file → no scraping needed.
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url)) {
    return NextResponse.json({ kind: "image", imageUrl: url, title: null, embedUrl: null });
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return NextResponse.json({ kind: "video", videoUrl: url, imageUrl: null, title: null, embedUrl: null });
  }

  // Known video platforms → embeddable player + thumbnail.
  const yt = ytId(url);
  if (yt) {
    return NextResponse.json({
      kind: "video",
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      imageUrl: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      title: null,
    });
  }
  const vim = vimeoId(url);
  if (vim) {
    return NextResponse.json({ kind: "video", embedUrl: `https://player.vimeo.com/video/${vim}`, imageUrl: null, title: null });
  }

  // Otherwise scrape Open Graph tags for a link preview.
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ResidenceHub/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return NextResponse.json({ kind: "link", imageUrl: null, title: null });
    const html = await res.text();

    // Robust OG/Twitter meta extractor: scans every <meta> tag, tolerant of
    // attribute order and of `property=` vs `name=` (Pinterest uses name=, and
    // puts content= first). Falls back to twitter:* then <title>.
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

    const imageUrl = metaContent("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src");
    const title =
      metaContent("og:title", "twitter:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null;
    const description = metaContent("og:description", "twitter:description");
    const ogVideo = metaContent("og:video", "og:video:url", "og:video:secure_url");

    return NextResponse.json({
      kind: ogVideo ? "video" : imageUrl ? "image" : "link",
      imageUrl,
      title,
      description,
      embedUrl: ogVideo,
    });
  } catch {
    return NextResponse.json({ kind: "link", imageUrl: null, title: null });
  }
}
