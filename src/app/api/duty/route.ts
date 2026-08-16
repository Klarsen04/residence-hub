import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expandRecurrence } from "@/lib/recurrence";

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

  const { date, type, title, notes, tagId, recurrenceDays, weeks, until, dates, raId } = await req.json();
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  const day = String(date).slice(0, 10);

  const ownerId = await resolveOwner(raId, session.user.id);
  if (!ownerId) return NextResponse.json({ error: "Selected RA not found" }, { status: 400 });

  // A dangling tagId would fail the foreign key on create — drop it instead.
  let validTagId: string | null = tagId || null;
  if (validTagId) {
    const tag = await prisma.tag.findUnique({ where: { id: validTagId }, select: { id: true } });
    if (!tag) validTagId = null;
  }

  let days: string[];
  try {
    days = expandRecurrence({
      start: day,
      weekdays: Array.isArray(recurrenceDays) ? recurrenceDays : [],
      until: typeof until === "string" && until ? until.slice(0, 10) : undefined,
      weeks: typeof weeks === "number" ? weeks : undefined,
      extraDates: Array.isArray(dates) ? dates.map((d) => String(d).slice(0, 10)) : [],
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid repeat settings" }, { status: 400 });
  }

  // One id across the whole run, so the series can be removed in one action. A
  // lone shift gets none — it isn't a series and shouldn't offer series actions.
  const seriesId = days.length > 1 ? crypto.randomUUID() : null;

  await prisma.dutyShift.createMany({
    data: days.map((d) => ({
      userId: ownerId,
      date: d,
      type: type || "evening",
      title: title || null,
      notes: notes || null,
      tagId: validTagId,
      seriesId,
    })),
  });

  return NextResponse.json({ created: days.length, seriesId });
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
  // scope=series removes every shift created alongside this one, so clearing a
  // repeat doesn't mean clicking each date on the calendar.
  const series = searchParams.get("scope") === "series";
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.dutyShift.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await isAdmin(session.user.id);
  if (existing.userId !== session.user.id && !admin) {
    return NextResponse.json({ error: "You can only remove your own shifts" }, { status: 403 });
  }

  if (series && existing.seriesId) {
    // Scoped to shifts this person is allowed to remove: an admin clears the
    // whole run, an RA only their own, so a shared series can't be wiped for
    // someone else.
    const { count } = await prisma.dutyShift.deleteMany({
      where: { seriesId: existing.seriesId, ...(admin ? {} : { userId: session.user.id }) },
    });
    return NextResponse.json({ success: true, deleted: count });
  }

  await prisma.dutyShift.delete({ where: { id } });
  return NextResponse.json({ success: true, deleted: 1 });
}
