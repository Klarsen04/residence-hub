import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

// Incidents are private by default; the owner can mark one public so every RA
// sees it. GET returns your own + everyone's public ones.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(session.user.id);

  const incidents = await prisma.incident.findMany({
    where: admin ? undefined : { OR: [{ userId: session.user.id }, { isPublic: true }] },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const withOwnership = incidents.map((i) => ({
    ...i,
    ownerId: i.userId,
    ownerName: i.user?.name || i.user?.email || "Unknown RA",
    canEdit: i.userId === session.user.id || admin,
    user: undefined,
  }));

  return NextResponse.json(withOwnership);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, time, type, severity, location, description, actionTaken, followUpNeeded, isPublic } = await req.json();

  // All of these columns are NOT NULL — reject up front with a clear 400
  // instead of letting the insert 500.
  const missing = Object.entries({ date, time, type, location, description })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }

  const incident = await prisma.incident.create({
    data: {
      userId: session.user.id,
      date,
      time,
      type,
      severity,
      location,
      description,
      actionTaken,
      followUpNeeded: followUpNeeded || false,
      isPublic: isPublic || false,
    },
  });

  return NextResponse.json(incident);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, followUpNeeded, isPublic } = await req.json();

  // Only the owning RA (or an admin) may change an incident.
  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only edit your own incidents" }, { status: 403 });
  }

  const incident = await prisma.incident.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(followUpNeeded !== undefined && { followUpNeeded }),
      ...(isPublic !== undefined && { isPublic }),
    },
  });

  return NextResponse.json(incident);
}

// Remove a mis-filed report. Same owner-or-admin rule as PUT.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only delete your own incidents" }, { status: 403 });
  }

  await prisma.incident.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
