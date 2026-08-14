import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Room-check history is PUBLIC to the whole platform (everyone sees every RA's
// rounds); the page can filter by RA. Each RA still only creates their own.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rounds = await prisma.roomCheckRound.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const formatted = rounds.map((r) => ({
    ...r,
    rooms: JSON.parse(r.rooms),
    date: r.createdAt, // page reads `.date`
    ownerId: r.userId,
    ownerName: r.user?.name || r.user?.email || "Unknown RA",
    user: undefined,
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, rooms } = await req.json();

  const round = await prisma.roomCheckRound.create({
    data: {
      userId: session.user.id,
      type,
      rooms: JSON.stringify(rooms),
    },
  });

  return NextResponse.json(round);
}
