import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { organizerId: session.user.id },
        { hallId: session.user.hallId || undefined },
        { coOrganizers: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      hall: { select: { name: true } },
      organizer: { select: { name: true, image: true } },
      _count: { select: { coOrganizers: true, photos: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, date, startTime, endTime, location, category } = body;

  if (!title || !date || !startTime || !endTime || !category) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const dateObj = new Date(date);
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startDateTime = new Date(dateObj);
  startDateTime.setHours(startH, startM, 0, 0);

  const endDateTime = new Date(dateObj);
  endDateTime.setHours(endH, endM, 0, 0);

  const event = await prisma.event.create({
    data: {
      title,
      description,
      date: dateObj,
      startTime: startDateTime,
      endTime: endDateTime,
      location,
      category,
      organizerId: session.user.id,
      hallId: session.user.hallId,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
