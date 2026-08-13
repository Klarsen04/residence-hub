import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// Returns the current RA's saved results for this board. Every user only ever
// sees their own results (checks are per-RA).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const results = await prisma.roomCheckResult.findMany({
    where: { boardId, userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(results);
}

// Record (or overwrite) a result for one resident. Enforces one-per-resident
// per RA per board via a manual "find then update/create" — plain SQLite
// doesn't do upsert-on-multi-column-composite here without a unique index.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const board = await prisma.roomCheckBoard.findUnique({ where: { id: boardId } });
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  const { residentId, residentName, room, status, notes } = await req.json();
  if (!residentName) return NextResponse.json({ error: "Resident name required" }, { status: 400 });
  if (!["pass", "fail"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = residentId
    ? await prisma.roomCheckResult.findFirst({ where: { boardId, userId: session.user.id, residentId } })
    : null;

  const saved = existing
    ? await prisma.roomCheckResult.update({
        where: { id: existing.id },
        data: { status, notes: notes || null, residentName, room: room || null },
      })
    : await prisma.roomCheckResult.create({
        data: {
          boardId,
          userId: session.user.id,
          residentId: residentId || null,
          residentName,
          room: room || null,
          status,
          notes: notes || null,
        },
      });

  // Email the resident on a "fail" result (only if we have their email and we
  // didn't already email them for this row on a previous save).
  let emailed = false;
  if (status === "fail" && residentId && !existing) {
    const resident = await prisma.resident.findUnique({ where: { id: residentId }, select: { email: true, name: true } });
    if (resident?.email) {
      const result = await sendEmail({
        to: resident.email,
        subject: `Room Check — re-inspection needed for Room ${room || ""}`,
        html: `<p>Hi ${resident.name || "there"},</p>
<p>During a recent <strong>${board.type}</strong> room check (${board.title}), your room${room ? ` (<strong>Room ${room}</strong>)` : ""} did not pass and needs a re-inspection.</p>
${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ""}
<p>Please address this and follow up with your RA. Thank you.</p>`,
      });
      emailed = result.sent;
    }
  }

  return NextResponse.json({ ...saved, emailed }, { status: existing ? 200 : 201 });
}

// Delete a single result (e.g. RA marked the wrong resident by accident).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const { searchParams } = new URL(req.url);
  const resultId = searchParams.get("resultId");
  if (!resultId) return NextResponse.json({ error: "resultId required" }, { status: 400 });

  const existing = await prisma.roomCheckResult.findUnique({ where: { id: resultId } });
  if (!existing || existing.boardId !== boardId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Only the RA who recorded it may remove it.
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.roomCheckResult.delete({ where: { id: resultId } });
  return NextResponse.json({ success: true });
}
