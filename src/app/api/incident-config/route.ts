import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCIDENT_TRACKS, CAMPUS_RESOURCES } from "@/lib/nyitResources";

// Admin-editable "Reporting tracks" + "Campus resources" shown on the incidents
// page. Stored as JSON in the Setting table; falls back to the built-in
// defaults until an admin customizes them.
const TRACKS_KEY = "incident_tracks";
const RESOURCES_KEY = "campus_resources";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

const parse = <T>(v: string | undefined, fallback: T): T => {
  if (!v) return fallback;
  try { const p = JSON.parse(v); return Array.isArray(p) ? (p as T) : fallback; } catch { return fallback; }
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.setting.findMany({ where: { key: { in: [TRACKS_KEY, RESOURCES_KEY] } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return NextResponse.json({
    tracks: parse(map[TRACKS_KEY], INCIDENT_TRACKS),
    resources: parse(map[RESOURCES_KEY], CAMPUS_RESOURCES),
    canEdit: await isAdmin(session.user.id),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Only an admin can edit these lists" }, { status: 403 });
  }

  const { tracks, resources } = await req.json();
  const save = (key: string, val: unknown) =>
    prisma.setting.upsert({
      where: { key },
      update: { value: JSON.stringify(val) },
      create: { key, value: JSON.stringify(val) },
    });

  if (Array.isArray(tracks)) await save(TRACKS_KEY, tracks);
  if (Array.isArray(resources)) await save(RESOURCES_KEY, resources);

  return NextResponse.json({ ok: true });
}
