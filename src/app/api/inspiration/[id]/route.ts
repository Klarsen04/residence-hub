import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, url, source, category, tags, isPublic } = body;

  const existing = await prisma.inspiration.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  // Only what the request actually carries, so the share toggle on a card can send
  // `isPublic` on its own without blanking the tags.
  const updated = await prisma.inspiration.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(url !== undefined && { url }),
      ...(source !== undefined && { source }),
      ...(category !== undefined && { category }),
      ...(tags !== undefined && { tags: JSON.stringify(tags || []) }),
      ...(isPublic !== undefined && { isPublic: isPublic === true }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.inspiration.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  await prisma.inspiration.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
