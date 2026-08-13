import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Check-ins are private per RA. Optionally scoped to a board via ?boardId=
// ("individual" = no board).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const boardId = searchParams.get("boardId");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (boardId === "individual") where.boardId = null;
  else if (boardId) where.boardId = boardId;

  const checkIns = await prisma.checkIn.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checkIns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { residentId, residentName, room, mood, topics, notes, followUp, boardId } = await req.json();

  if (!residentName) {
    return NextResponse.json({ error: "Resident name required" }, { status: 400 });
  }

  // Duplicate prevention (only enforceable when we know which resident).
  if (residentId) {
    const board = boardId ? await prisma.checkInBoard.findUnique({ where: { id: boardId }, select: { scope: true } }) : null;

    if (board?.scope === "shared") {
      // Shared campaign: one check-in per resident, ever.
      const already = await prisma.checkIn.findFirst({
        where: { userId: session.user.id, residentId, boardId },
        select: { id: true },
      });
      if (already) {
        return NextResponse.json({ error: "You've already checked this resident in for this board." }, { status: 409 });
      }
    } else {
      // Personal board / individual: one check-in per resident per day.
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const already = await prisma.checkIn.findFirst({
        where: {
          userId: session.user.id,
          residentId,
          boardId: boardId || null,
          createdAt: { gte: start, lte: end },
        },
        select: { id: true },
      });
      if (already) {
        return NextResponse.json({ error: "You already checked this resident in today." }, { status: 409 });
      }
    }
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      userId: session.user.id,
      residentId: residentId || null,
      residentName,
      room: room || null,
      mood: mood || "good",
      topics: topics ? JSON.stringify(topics) : null,
      notes,
      followUp: followUp || false,
      boardId: boardId || null,
    },
  });

  return NextResponse.json(checkIn, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, mood, topics, notes, followUp } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.checkIn.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Check-ins are private — only the RA who logged it may change it.
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own check-ins" }, { status: 403 });
  }

  const checkIn = await prisma.checkIn.update({
    where: { id },
    data: {
      ...(mood !== undefined && { mood }),
      ...(topics !== undefined && { topics: topics ? JSON.stringify(topics) : null }),
      ...(notes !== undefined && { notes }),
      ...(followUp !== undefined && { followUp }),
    },
  });

  return NextResponse.json(checkIn);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.checkIn.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only delete your own check-ins" }, { status: 403 });
  }

  await prisma.checkIn.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
