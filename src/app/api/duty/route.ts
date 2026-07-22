import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shifts = await prisma.dutyShift.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(shifts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, type, notes, userId } = await req.json();

  const shift = await prisma.dutyShift.create({
    data: {
      userId: userId || session.user.id,
      date,
      type: type || "evening",
      notes,
    },
  });

  return NextResponse.json(shift);
}
