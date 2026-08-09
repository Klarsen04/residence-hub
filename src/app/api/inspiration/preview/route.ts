import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLinkPreview } from "@/lib/linkPreview";

// Live link preview for the inspiration composer: resolves a pasted URL to an
// image/title/video via the shared getLinkPreview helper.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  const preview = await getLinkPreview(url);
  return NextResponse.json(preview);
}
