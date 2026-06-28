import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.decorationFavorite.findUnique({
    where: { decorationId_userId: { decorationId: id, userId: session.user.id } },
  });

  if (existing) {
    await prisma.decorationFavorite.delete({ where: { id: existing.id } });
    await prisma.decoration.update({ where: { id }, data: { favorites: { decrement: 1 } } });
    return NextResponse.json({ favorited: false });
  } else {
    await prisma.decorationFavorite.create({ data: { decorationId: id, userId: session.user.id } });
    await prisma.decoration.update({ where: { id }, data: { favorites: { increment: 1 } } });
    return NextResponse.json({ favorited: true });
  }
}
