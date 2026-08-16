import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REVIEWS, visibilityOnCreate, visibilityOnUpdate, type Review } from "@/lib/incidentVisibility";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

const SEVERITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "resolved", "escalated"];

/** Fields an RA may change on their own report after filing it. */
const EDITABLE = ["date", "time", "type", "severity", "location", "description", "actionTaken"] as const;

// Incidents are private by default. Sharing one with every RA needs an admin to
// approve it first, so GET returns your own + everything already approved.
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
    // Whose report this is. Only the owner rewrites it or decides to publish it;
    // an admin looking at someone else's is reviewing, not editing.
    isOwner: i.userId === session.user.id,
    canEdit: i.userId === session.user.id || admin,
    // Only an admin can act on a sharing request — the UI hides the buttons too,
    // but the flag keeps the two in step.
    canApprove: admin,
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
  if (severity !== undefined && severity && !SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: "Unknown severity" }, { status: 400 });
  }

  // Asking to share doesn't publish it — the rules live in one place.
  const wantsShare = !!isPublic;
  const visibility = visibilityOnCreate({
    wantsShare,
    admin: wantsShare ? await isAdmin(session.user.id) : false,
  });

  const incident = await prisma.incident.create({
    data: {
      userId: session.user.id,
      date,
      time,
      type,
      severity: severity || "low",
      location,
      description,
      actionTaken,
      followUpNeeded: followUpNeeded || false,
      ...visibility,
    },
  });

  return NextResponse.json(incident);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, followUpNeeded, requestPublic, review } = body;

  // Only the owning RA (or an admin) may change an incident.
  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = await isAdmin(session.user.id);
  if (existing.userId !== session.user.id && !admin) {
    return NextResponse.json({ error: "You can only edit your own incidents" }, { status: 403 });
  }

  if (status !== undefined && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }
  if (body.severity !== undefined && body.severity && !SEVERITIES.includes(body.severity)) {
    return NextResponse.json({ error: "Unknown severity" }, { status: 400 });
  }
  if (review !== undefined) {
    if (!admin) return NextResponse.json({ error: "Only an admin can review a sharing request" }, { status: 403 });
    if (!REVIEWS.includes(review)) return NextResponse.json({ error: "Unknown review verdict" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  // Content edits. Only fields actually present in the request are touched, so
  // a status-only call can't blank out the report.
  let contentChanged = false;
  for (const field of EDITABLE) {
    const value = body[field];
    if (value === undefined) continue;
    if ((field === "date" || field === "time" || field === "type" || field === "location" || field === "description") && !value) {
      return NextResponse.json({ error: `${field} can't be empty` }, { status: 400 });
    }
    data[field] = field === "actionTaken" ? value || null : value;
    if (value !== existing[field]) contentChanged = true;
  }

  if (status !== undefined) data.status = status;
  if (followUpNeeded !== undefined) data.followUpNeeded = followUpNeeded;

  // Visibility never comes straight off the wire — an `isPublic` in the body is
  // ignored, so it's only reachable through the request/approve pair.
  const visibility = visibilityOnUpdate({
    admin,
    wasPublic: existing.isPublic,
    wasApproved: existing.shareRequest === "approved",
    requestPublic,
    review: review as Review | undefined,
    contentChanged,
  });
  if (visibility) Object.assign(data, visibility);

  const incident = await prisma.incident.update({ where: { id }, data });

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
