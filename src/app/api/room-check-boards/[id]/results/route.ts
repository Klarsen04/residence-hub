import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const { resultId, residentId, residentName, room, status, notes } = await req.json();
  if (!residentName) return NextResponse.json({ error: "Resident name required" }, { status: 400 });
  if (!["pass", "fail"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // An edit names the row directly; a new mark matches on the resident so a
  // second pass over the same person overwrites rather than duplicates. Both
  // lookups are scoped to this RA's own rows, so a forged id can't reach
  // someone else's result.
  const existing = resultId
    ? await prisma.roomCheckResult.findFirst({ where: { id: resultId, boardId, userId: session.user.id } })
    : residentId
      ? await prisma.roomCheckResult.findFirst({ where: { boardId, userId: session.user.id, residentId } })
      : null;

  // Editing a row that's since been deleted (or isn't yours) shouldn't quietly
  // turn into a new result.
  if (resultId && !existing) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

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

  return NextResponse.json(saved, { status: existing ? 200 : 201 });
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
