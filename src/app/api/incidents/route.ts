import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const incidents = await prisma.incident.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(incidents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, time, type, severity, location, description, actionTaken, followUpNeeded } = await req.json();

  const incident = await prisma.incident.create({
    data: {
      userId: session.user.id,
      date,
      time,
      type,
      severity,
      location,
      description,
      actionTaken,
      followUpNeeded: followUpNeeded || false,
    },
  });

  return NextResponse.json(incident);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, followUpNeeded } = await req.json();

  const incident = await prisma.incident.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(followUpNeeded !== undefined && { followUpNeeded }),
    },
  });

  return NextResponse.json(incident);
}
