import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Weekly digest (Vercel Cron): sends each RA an in-app notification listing
// their residents not checked in for 7+ days. Secured with CRON_SECRET when
// set; an unset secret is only allowed outside production.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [residents, recent] = await Promise.all([
    prisma.resident.findMany({ select: { id: true, name: true, room: true, userId: true } }),
    prisma.checkIn.findMany({
      where: { createdAt: { gte: weekAgo }, residentId: { not: null } },
      select: { residentId: true },
    }),
  ]);

  const checkedRecently = new Set(recent.map((c) => c.residentId));

  // Group overdue residents by their owning RA.
  const byOwner = new Map<string, string[]>();
  for (const r of residents) {
    if (checkedRecently.has(r.id)) continue;
    const list = byOwner.get(r.userId) || [];
    list.push(`${r.name}${r.room ? ` (Rm ${r.room})` : ""}`);
    byOwner.set(r.userId, list);
  }

  let notified = 0;
  for (const [ownerId, list] of byOwner.entries()) {
    if (list.length === 0) continue;
    const preview = list.slice(0, 5).join(", ") + (list.length > 5 ? `, +${list.length - 5} more` : "");
    if (await notify(ownerId, "team", `${list.length} resident${list.length === 1 ? "" : "s"} due for check-in`, preview)) notified++;
  }

  return NextResponse.json({ owners: byOwner.size, notified });
}
