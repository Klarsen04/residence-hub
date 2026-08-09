import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roster is PUBLIC to the whole platform (everyone can see all RAs' residents,
// grouped by RA), but each RA can only create/edit/delete their OWN residents.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const residents = await prisma.resident.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ floor: "asc" }, { wing: "asc" }, { room: "asc" }],
  });

  // Tag each resident with owner info + whether the current user can edit it.
  const withOwnership = residents.map((r) => ({
    ...r,
    ownerId: r.userId,
    ownerName: r.user?.name || r.user?.email || "Unknown RA",
    canEdit: r.userId === session.user.id,
    user: undefined,
  }));

  return NextResponse.json(withOwnership);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, room, floor, wing, phone, email, year, major, notes, moveInDate } =
    await req.json();

  if (!name || !room) {
    return NextResponse.json({ error: "Name and room required" }, { status: 400 });
  }

  const resident = await prisma.resident.create({
    data: {
      userId: session.user.id,
      name,
      room,
      floor: floor || null,
      wing: wing || null,
      phone,
      email,
      year,
      major,
      notes,
      moveInDate,
    },
  });

  return NextResponse.json(resident);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, room, floor, wing, phone, email, year, major, notes, flagged } =
    await req.json();

  // Enforce ownership: only the RA who created a resident may edit it.
  const existing = await prisma.resident.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own residents" }, { status: 403 });
  }

  const resident = await prisma.resident.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(room !== undefined && { room }),
      ...(floor !== undefined && { floor: floor || null }),
      ...(wing !== undefined && { wing: wing || null }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(year !== undefined && { year }),
      ...(major !== undefined && { major }),
      ...(notes !== undefined && { notes }),
      ...(flagged !== undefined && { flagged }),
    },
  });

  return NextResponse.json(resident);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.resident.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only delete your own residents" }, { status: 403 });
  }

  await prisma.resident.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
