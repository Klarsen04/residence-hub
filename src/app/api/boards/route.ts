import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBoard } from "@/lib/boardAccess";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(session.user.id);

  // Boards are PUBLIC to view — everyone sees every board — but only the
  // creator, collaborators, or an admin can edit (canManage).
  const boards = await prisma.planningBoard.findMany({
    include: {
      user: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      items: { orderBy: { order: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withMeta = boards.map((b) => ({
    ...b,
    canManage: b.userId === session.user.id || admin || b.members.some((m) => m.userId === session.user.id),
  }));

  return NextResponse.json(withMeta);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, description } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  if (!(await canManageBoard(id, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to edit this board" }, { status: 403 });
  }

  const board = await prisma.planningBoard.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
    },
  });
  return NextResponse.json(board);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.planningBoard.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only the creator or an admin may delete a whole board.
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Only the board owner or an admin can delete it" }, { status: 403 });
  }

  await prisma.planningBoard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const board = await prisma.planningBoard.create({
    data: {
      title,
      description,
      userId: session.user.id,
    },
    include: {
      user: { select: { name: true } },
      items: true,
    },
  });

  return NextResponse.json(board);
}
