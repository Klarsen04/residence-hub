import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

// Boards you can use: every "shared" board (admin-created, all RAs) + your own
// "personal" (private) boards.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(session.user.id);

  const boards = await prisma.checkInBoard.findMany({
    where: { OR: [{ scope: "shared" }, { ownerId: session.user.id }] },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const withMeta = boards.map((b) => ({
    ...b,
    ownerName: b.owner?.name || "Unknown",
    canDelete: b.ownerId === session.user.id || admin,
    owner: undefined,
  }));

  return NextResponse.json(withMeta);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, scope } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const admin = await isAdmin(session.user.id);
  // Only admins can create shared boards; everyone else gets a personal one.
  const resolvedScope = scope === "shared" && admin ? "shared" : "personal";

  const board = await prisma.checkInBoard.create({
    data: { title: title.trim(), scope: resolvedScope, ownerId: session.user.id },
  });

  return NextResponse.json(board, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.checkInBoard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.checkInBoard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
