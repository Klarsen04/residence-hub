import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBoard } from "@/lib/boardAccess";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, type, content } = await req.json();
  const { id: boardId } = await params;

  // Only the board's creator, collaborators, or an admin may add cards.
  if (!(await canManageBoard(boardId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to edit this board" }, { status: 403 });
  }
  const board = await prisma.planningBoard.findUnique({ where: { id: boardId } });
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  const maxOrder = await prisma.planningBoardItem.aggregate({
    where: { boardId },
    _max: { order: true },
  });

  const item = await prisma.planningBoardItem.create({
    data: {
      boardId,
      title,
      type: type || "TASK",
      content,
      order: (maxOrder._max.order || 0) + 1,
    },
  });

  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  if (!(await canManageBoard(boardId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to edit this board" }, { status: 403 });
  }

  const { itemId, title, type, content, order } = await req.json();

  const item = await prisma.planningBoardItem.update({
    where: { id: itemId },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  if (!(await canManageBoard(boardId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to edit this board" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

  await prisma.planningBoardItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
