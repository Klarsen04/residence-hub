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
  const { title, description, date, startTime, endTime, location, category, tagId, recurrenceDays } = body;

  if (!title || !date || !startTime || !endTime || !category) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const recurs = Array.isArray(recurrenceDays) && recurrenceDays.length > 0;

  // Build the set of dates: the chosen date, plus each matching weekday over the
  // next 8 weeks if recurrence days were selected.
  const base = new Date(date);
  const dates: Date[] = [];
  if (recurs) {
    for (let i = 0; i < 8 * 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      if (recurrenceDays.includes(d.getDay())) dates.push(d);
    }
    if (!dates.some((d) => d.toDateString() === base.toDateString())) dates.unshift(base);
  } else {
    dates.push(base);
  }

  const recurrenceJson = recurs ? JSON.stringify(recurrenceDays) : null;

  // Guard against a dangling hallId (e.g. an RA whose auth-code hall doesn't
  // exist in this DB) — a missing hall would fail the foreign key on create.
  let hallId = session.user.hallId || null;
  if (hallId) {
    const hall = await prisma.residenceHall.findUnique({ where: { id: hallId }, select: { id: true } });
    if (!hall) hallId = null;
  }

  const makeData = (dateObj: Date) => {
    const startDateTime = new Date(dateObj); startDateTime.setHours(startH, startM, 0, 0);
    const endDateTime = new Date(dateObj); endDateTime.setHours(endH, endM, 0, 0);
    return {
      title, description, date: dateObj, startTime: startDateTime, endTime: endDateTime,
      location, category, tagId: tagId || null, recurrenceDays: recurrenceJson,
      organizerId: session.user.id, hallId,
    };
  };

  try {
    // Create the first as the returned event; bulk-create the rest.
    const event = await prisma.event.create({ data: makeData(dates[0]) });
    if (dates.length > 1) {
      await prisma.event.createMany({ data: dates.slice(1).map(makeData) });
    }
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("Failed to create event:", err);
    return NextResponse.json({ message: "Could not create event" }, { status: 500 });
  }
}
