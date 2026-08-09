import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rounds = await prisma.roomCheckRound.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const formatted = rounds.map((r) => ({
    ...r,
    rooms: JSON.parse(r.rooms),
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
