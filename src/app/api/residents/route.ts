import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Roster is PUBLIC to the whole platform (everyone can see all RAs' residents,
// grouped by RA), but each RA can only create/edit/delete their OWN residents.
// An RA can manage their own residents; ADMINs can manage any.
async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(session.user.id);

  const residents = await prisma.resident.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ floor: "asc" }, { wing: "asc" }, { room: "asc" }],
  });

  // Tag each resident with owner info + whether the current user can edit it.
  const withOwnership = residents.map((r) => ({
    ...r,
    ownerId: r.userId,
    ownerName: r.user?.name || r.user?.email || "Unknown RA",
    canEdit: r.userId === session.user.id || admin,
    user: undefined,
  }));

  return NextResponse.json(withOwnership);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, room, floor, wing, phone, email, year, major, notes, moveInDate, raId } =
    await req.json();

  if (!name || !room || !floor || !wing || !email || !year) {
    return NextResponse.json(
      { error: "Name, room, floor, wing, email, and year are required" },
      { status: 400 }
    );
  }

  // Assign the resident to the chosen RA (a user id); default to the creator.
  let ownerId = session.user.id;
  if (raId && raId !== session.user.id) {
    const ra = await prisma.user.findUnique({ where: { id: raId }, select: { id: true } });
    if (!ra) return NextResponse.json({ error: "Selected RA not found" }, { status: 400 });
    ownerId = ra.id;
  }

  const resident = await prisma.resident.create({
    data: {
      userId: ownerId,
      name,
      room,
      floor,
      wing,
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

  const { id, name, room, floor, wing, phone, email, year, major, notes, flagged, raId } =
    await req.json();

  // Ownership: the RA who owns a resident — or any ADMIN — may edit it.
  const existing = await prisma.resident.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only edit your own residents" }, { status: 403 });
  }

  // Required fields can't be blanked out when they're part of the update.
  // Partial updates (e.g. toggling `flagged` or appending a note) omit these
  // keys entirely, so they stay untouched.
  const requiredWhenPresent: Record<string, unknown> = { name, room, floor, wing, email, year };
  for (const [key, value] of Object.entries(requiredWhenPresent)) {
    if (value !== undefined && !String(value).trim()) {
      return NextResponse.json({ error: `${key} cannot be empty` }, { status: 400 });
    }
  }

  // Optional reassignment to a different RA (user id).
  let newOwnerId: string | undefined;
  if (raId !== undefined && raId && raId !== existing.userId) {
    const ra = await prisma.user.findUnique({ where: { id: raId }, select: { id: true } });
    if (!ra) return NextResponse.json({ error: "Selected RA not found" }, { status: 400 });
    newOwnerId = ra.id;
  }

  const resident = await prisma.resident.update({
    where: { id },
    data: {
      ...(newOwnerId && { userId: newOwnerId }),
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
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only delete your own residents" }, { status: 403 });
  }

  await prisma.resident.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
