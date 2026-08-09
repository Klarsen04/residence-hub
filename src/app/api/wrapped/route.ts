import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Residence Life Wrapped — a Spotify-Wrapped-style season recap for the RA.
// Aggregates real counts from the RA's own records, plus a few computed
// "highlights" (busiest month, top event category, biggest event).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [
    events,
    incidents,
    checkIns,
    roomChecks,
    polls,
    notes,
    dutyShifts,
    residents,
    decorationsMade,
    inspirations,
  ] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: userId },
      select: { title: true, date: true, category: true, attendance: true },
    }),
    prisma.incident.count({ where: { userId } }),
    prisma.checkIn.count({ where: { userId } }),
    prisma.roomCheckRound.count({ where: { userId } }),
    prisma.poll.count({ where: { userId } }),
    prisma.note.count({ where: { userId } }),
    prisma.dutyShift.count({ where: { userId } }),
    prisma.resident.count({ where: { userId } }),
    prisma.decorationMade.count({ where: { userId } }),
    prisma.inspiration.count({ where: { userId } }),
  ]);

  // Total attendance across events the RA organized.
  const totalAttendance = events.reduce((sum, e) => sum + (e.attendance || 0), 0);

  // Top event category.
  const categoryCounts: Record<string, number> = {};
  for (const e of events) {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  }
  const topCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Busiest month by event count.
  const monthCounts: Record<string, number> = {};
  for (const e of events) {
    const m = new Date(e.date).toLocaleDateString("en-US", { month: "long" });
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  }
  const busiestMonth =
    Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Biggest event by attendance.
  const biggestEvent = [...events].sort(
    (a, b) => (b.attendance || 0) - (a.attendance || 0)
  )[0];

  return NextResponse.json({
    name: session.user.name || "RA",
    stats: {
      events: events.length,
      totalAttendance,
      residents,
      checkIns,
      roomChecks,
      incidents,
      polls,
      notes,
      dutyShifts,
      decorationsMade,
      inspirations,
    },
    highlights: {
      topCategory: topCategory?.replace(/_/g, " ") || null,
      busiestMonth,
      biggestEvent: biggestEvent
        ? { title: biggestEvent.title, attendance: biggestEvent.attendance || 0 }
        : null,
    },
  });
}
