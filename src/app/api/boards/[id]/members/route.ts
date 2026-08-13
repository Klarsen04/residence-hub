import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBoard } from "@/lib/boardAccess";

// Add a collaborator to a board. Creator, existing collaborators, or admins
// may add others.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  if (!(await canManageBoard(boardId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this board" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 400 });

  const member = await prisma.planningBoardMember.upsert({
    where: { boardId_userId: { boardId, userId } },
    update: {},
    create: { boardId, userId },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // You can remove yourself; otherwise you need manage rights on the board.
  if (userId !== session.user.id && !(await canManageBoard(boardId, session.user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.planningBoardMember.deleteMany({ where: { boardId, userId } });
  return NextResponse.json({ success: true });
}
