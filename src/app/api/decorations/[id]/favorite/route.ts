import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const decoration = await prisma.decoration.findUnique({ where: { id }, select: { id: true } });
  if (!decoration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Toggle + counter update atomically; the counter is derived from the real
  // favourite count so it can never drift.
  const favorited = await prisma.$transaction(async (tx) => {
    const existing = await tx.decorationFavorite.findUnique({
      where: { decorationId_userId: { decorationId: id, userId: session.user.id } },
    });
    if (existing) {
      await tx.decorationFavorite.delete({ where: { id: existing.id } });
    } else {
      await tx.decorationFavorite.create({ data: { decorationId: id, userId: session.user.id } });
    }
    const count = await tx.decorationFavorite.count({ where: { decorationId: id } });
    await tx.decoration.update({ where: { id }, data: { favorites: count } });
    return !existing;
  });

  return NextResponse.json({ favorited });
}
