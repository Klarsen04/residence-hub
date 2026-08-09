import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, type, notes, tagId, recurrenceDays, weeks } = await req.json();
  const day = String(date).slice(0, 10);

  // If recurrenceDays given, create a shift on each matching day for N weeks.
  const days = Array.isArray(recurrenceDays) && recurrenceDays.length > 0
    ? expandDates(day, recurrenceDays, weeks || 8)
    : [day];

  await prisma.dutyShift.createMany({
    data: days.map((d) => ({
      userId: session.user.id,
      date: d,
      type: type || "evening",
      notes: notes || null,
      tagId: tagId || null,
    })),
  });

  return NextResponse.json({ created: days.length });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Anyone can view all shifts, but you can only remove your own.
  const existing = await prisma.dutyShift.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only remove your own shifts" }, { status: 403 });
  }

  await prisma.dutyShift.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
