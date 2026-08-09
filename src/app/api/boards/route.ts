import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Boards are PUBLIC to the whole platform — everyone sees every board.
  const boards = await prisma.planningBoard.findMany({
    include: {
      user: { select: { id: true, name: true } },
      members: { include: { user: { select: { name: true } } } },
      items: { orderBy: { order: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(boards);
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
