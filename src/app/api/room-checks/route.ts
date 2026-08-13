import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// Room-check history is PUBLIC to the whole platform (everyone sees every RA's
// rounds); the page can filter by RA. Each RA still only creates their own.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rounds = await prisma.roomCheckRound.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const formatted = rounds.map((r) => ({
    ...r,
    rooms: JSON.parse(r.rooms),
    date: r.createdAt, // page reads `.date`
    ownerId: r.userId,
    ownerName: r.user?.name || r.user?.email || "Unknown RA",
    user: undefined,
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, rooms } = await req.json();

  const round = await prisma.roomCheckRound.create({
    data: {
      userId: session.user.id,
      type,
      rooms: JSON.stringify(rooms),
    },
  });

  // Email residents whose room was flagged as a concern (fail), using the
  // address on their roster record. Non-blocking: email failures never fail
  // the save. Rooms are objects: { room, residents:[{name,email}], status, notes }.
  const emailed: string[] = [];
  try {
    const flagged = Array.isArray(rooms) ? rooms.filter((r: any) => r.status === "concern") : [];
    for (const room of flagged) {
      const residents = Array.isArray(room.residents) ? room.residents : [];
      for (const resident of residents) {
        if (!resident?.email) continue;
        const notes = room.notes ? `<p><strong>Notes:</strong> ${room.notes}</p>` : "";
        const result = await sendEmail({
          to: resident.email,
          subject: `Room Check — action needed for Room ${room.room}`,
          html: `<p>Hi ${resident.name || "there"},</p>
<p>During a recent <strong>${type}</strong> room check, your room (<strong>Room ${room.room}</strong>) was flagged with a concern that needs your attention.</p>
${notes}
<p>Please follow up with your RA. Thank you.</p>`,
        });
        if (result.sent) emailed.push(resident.email);
      }
    }
  } catch (e) {
    console.error("[room-checks] email step failed:", e);
  }

  return NextResponse.json({ ...round, emailed: emailed.length });
}
