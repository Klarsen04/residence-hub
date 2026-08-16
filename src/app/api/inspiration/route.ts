import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLinkPreview } from "@/lib/linkPreview";

// Your own saves, plus whatever other RAs have chosen to share.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inspirations = await prisma.inspiration.findMany({
    where: { OR: [{ userId: session.user.id }, { isPublic: true }] },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const withOwnership = inspirations.map((i) => ({
    ...i,
    // Only the person who saved it can edit, share or remove it.
    isOwner: i.userId === session.user.id,
    ownerName: i.user?.name || i.user?.email || "Another RA",
    user: undefined,
  }));

  return NextResponse.json(withOwnership);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, url, imageUrl, source, category, tags, isPublic } = body;

  if (!source) {
    return NextResponse.json({ message: "Source is required" }, { status: 400 });
  }

  let resolvedImageUrl = imageUrl || null;
  let resolvedTitle = title || null;

  if (url && !imageUrl) {
    const ogData = await getLinkPreview(url);
    if (ogData.imageUrl) resolvedImageUrl = ogData.imageUrl;
    if (!title && ogData.title) resolvedTitle = ogData.title;
  }

  const inspiration = await prisma.inspiration.create({
    data: {
      userId: session.user.id,
      title: resolvedTitle,
      url,
      imageUrl: resolvedImageUrl,
      source,
      category,
      tags: JSON.stringify(tags || []),
      // Private unless the save explicitly says otherwise.
      isPublic: isPublic === true,
    },
  });

  return NextResponse.json(inspiration, { status: 201 });
}
