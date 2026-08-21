import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      hall: { select: { name: true } },
      organizer: { select: { name: true, image: true } },
      coOrganizers: { include: { user: { select: { name: true } } } },
      photos: true,
      learningOutcomes: true,
      comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, date, startTime, endTime, location, category, status, attendance, reflection } = body;

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Only the organizer (or an admin) may edit an event.
  if (existing.organizerId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only edit your own events" }, { status: 403 });
  }

  // Guard against partial bodies: date/startTime/endTime are always rewritten
  // below, so they must be present and well-formed.
  if (!date || typeof startTime !== "string" || !startTime.includes(":") || typeof endTime !== "string" || !endTime.includes(":")) {
    return NextResponse.json({ error: "date, startTime, and endTime are required (times as HH:MM)" }, { status: 400 });
  }

  // Parse plain YYYY-MM-DD as *local* midnight (new Date("YYYY-MM-DD") is UTC).
  const dayStr = String(date).slice(0, 10);
  const dateObj = /^\d{4}-\d{2}-\d{2}$/.test(dayStr) ? new Date(dayStr + "T00:00:00") : new Date(date);
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  if (isNaN(dateObj.getTime()) || isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return NextResponse.json({ error: "Invalid date or time format" }, { status: 400 });
  }

  // Attendance is optional and clearable. Blank means "not recorded", so it goes
  // back to null rather than being coerced into NaN.
  let attendanceCount: number | null = null;
  if (attendance !== undefined) {
    const raw = typeof attendance === "string" ? attendance.trim() : attendance;
    if (raw === "" || raw === null) {
      attendanceCount = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return NextResponse.json({ error: "Attendance must be a whole number of residents" }, { status: 400 });
      }
      attendanceCount = parsed;
    }
  }

  const startDateTime = new Date(dateObj);
  startDateTime.setHours(startH, startM, 0, 0);

  const endDateTime = new Date(dateObj);
  endDateTime.setHours(endH, endM, 0, 0);

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title,
      description,
      date: dateObj,
      startTime: startDateTime,
      endTime: endDateTime,
      location,
      category,
      status,
      ...(attendance !== undefined && { attendance: attendanceCount }),
      // An empty reflection is a removed reflection, not an empty string, so the
      // write-up stops rendering once it's cleared.
      ...(reflection !== undefined && { reflection: (typeof reflection === "string" ? reflection.trim() : reflection) || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Only the organizer (or an admin) may delete an event.
  if (existing.organizerId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only delete your own events" }, { status: 403 });
  }

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
