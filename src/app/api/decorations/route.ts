import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateStoredImage } from "@/lib/photo";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  const admin = me?.role === "ADMIN";

  const decorations = await prisma.decoration.findMany({
    include: {
      user: { select: { name: true } },
      _count: { select: { favoritedBy: true } },
      favoritedBy: { where: { userId: session.user.id }, select: { id: true } },
    },
    // Newest first: this is a record of what the team has put up, so recent
    // work should be what you see when you open the page.
    orderBy: { createdAt: "desc" },
  });

  // Tag each with edit permission (creator or admin) for the UI.
  const withMeta = decorations.map((d) => ({ ...d, ownerId: d.userId, canEdit: d.userId === session.user.id || admin }));

  return NextResponse.json(withMeta);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, type, category, imageUrl } = await req.json();

  if (!title || !type || !category) {
    return NextResponse.json({ error: "Title, type, and category are required" }, { status: 400 });
  }

  const imageError = validateStoredImage(imageUrl);
  if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });

  const decoration = await prisma.decoration.create({
    data: {
      userId: session.user.id,
      title,
      type,
      category,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json(decoration, { status: 201 });
}
