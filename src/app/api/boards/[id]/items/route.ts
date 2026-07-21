import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, type, content } = await req.json();
  const { id: boardId } = await params;

  const board = await prisma.planningBoard.findFirst({
    where: {
      id: boardId,
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

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

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

  await prisma.planningBoardItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
