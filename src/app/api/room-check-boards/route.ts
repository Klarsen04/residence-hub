import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

// Everyone sees every board (they're admin-assigned campaigns). Each board
// carries per-RA progress so the UI can highlight what's done.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(session.user.id);

  const boards = await prisma.roomCheckBoard.findMany({
    include: {
      owner: { select: { name: true } },
      _count: { select: { results: true } },
      // Only pull the current user's result IDs (so we can count their progress);
      // full results are fetched per-board on the detail view.
      results: { where: { userId: session.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const withMeta = boards.map((b) => ({
    id: b.id,
    title: b.title,
    type: b.type,
    ownerId: b.ownerId,
    ownerName: b.owner?.name || "Admin",
    createdAt: b.createdAt,
    myDoneCount: b.results.length,
    canDelete: admin || b.ownerId === session.user.id,
  }));

  return NextResponse.json(withMeta);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can create boards. RAs check into an existing board.
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Only an admin can create a room-check board" }, { status: 403 });
  }

  const { title, type } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const board = await prisma.roomCheckBoard.create({
    data: { title: title.trim(), type: type || "Health & Safety", ownerId: session.user.id },
  });
  return NextResponse.json(board, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.roomCheckBoard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only the admin who created it (or any admin) may delete.
  if (existing.ownerId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.roomCheckBoard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
