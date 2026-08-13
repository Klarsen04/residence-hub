import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shifts = await prisma.dutyShift.findMany({
    include: { user: { select: { name: true } }, tag: true },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(shifts);
}

// Expand a start date + selected weekdays over the next `weeks` weeks.
function expandDates(startDay: string, weekdays: number[], weeks: number): string[] {
  if (!weekdays || weekdays.length === 0) return [startDay];
  const out = new Set<string>();
  const start = new Date(startDay + "T00:00:00");
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (weekdays.includes(d.getDay())) out.add(d.toISOString().slice(0, 10));
  }
  out.add(startDay);
  return [...out];
}

// Resolve which RA a shift belongs to. Defaults to the creator; an explicit
// raId assigns it to that user (validated).
async function resolveOwner(raId: string | undefined, fallback: string): Promise<string | null> {
  if (!raId || raId === fallback) return fallback;
  const ra = await prisma.user.findUnique({ where: { id: raId }, select: { id: true } });
  return ra?.id ?? null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, type, title, notes, tagId, recurrenceDays, weeks, raId } = await req.json();
  const day = String(date).slice(0, 10);

  const ownerId = await resolveOwner(raId, session.user.id);
  if (!ownerId) return NextResponse.json({ error: "Selected RA not found" }, { status: 400 });

  // If recurrenceDays given, create a shift on each matching day for N weeks.
  const days = Array.isArray(recurrenceDays) && recurrenceDays.length > 0
    ? expandDates(day, recurrenceDays, weeks || 8)
    : [day];

  await prisma.dutyShift.createMany({
    data: days.map((d) => ({
      userId: ownerId,
      date: d,
      type: type || "evening",
      title: title || null,
      notes: notes || null,
      tagId: tagId || null,
    })),
  });

  return NextResponse.json({ created: days.length });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, date, type, title, tagId, raId } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.dutyShift.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only edit your own shifts" }, { status: 403 });
  }

  let newOwnerId: string | undefined;
  if (raId !== undefined && raId && raId !== existing.userId) {
    const ownerId = await resolveOwner(raId, existing.userId);
    if (!ownerId) return NextResponse.json({ error: "Selected RA not found" }, { status: 400 });
    newOwnerId = ownerId;
  }

  const shift = await prisma.dutyShift.update({
    where: { id },
    data: {
      ...(newOwnerId && { userId: newOwnerId }),
      ...(date !== undefined && { date: String(date).slice(0, 10) }),
      ...(type !== undefined && { type }),
      ...(title !== undefined && { title: title || null }),
      ...(tagId !== undefined && { tagId: tagId || null }),
    },
  });

  return NextResponse.json(shift);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.dutyShift.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only remove your own shifts" }, { status: 403 });
  }

  await prisma.dutyShift.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
