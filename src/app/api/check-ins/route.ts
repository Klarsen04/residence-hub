import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checkIns = await prisma.checkIn.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checkIns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { residentId, residentName, room, mood, topics, notes, followUp } = await req.json();

  if (!residentName) {
    return NextResponse.json({ error: "Resident name required" }, { status: 400 });
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
    },
  });

  return NextResponse.json(checkIn);
}
