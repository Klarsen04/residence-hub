import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

const SHIFT_LABELS: Record<string, string> = { evening: "Evening", overnight: "Overnight", weekend: "Weekend" };

// Invoked by Vercel Cron (see vercel.json). Sends an in-app notification to
// every RA who has a duty shift *today*. Secured with CRON_SECRET when set
// (Vercel sends it as `Authorization: Bearer <CRON_SECRET>`); open in local
// dev only — in production an unset secret rejects all requests.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // en-CA formats YYYY-MM-DD; APP_TIMEZONE should be set to the campus timezone (e.g. "America/New_York").
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "UTC" }).format(new Date());
  const shifts = await prisma.dutyShift.findMany({
    where: { date: today },
    include: { tag: { select: { name: true } } },
  });

  let notified = 0;
  for (const s of shifts) {
    const label = s.title || s.tag?.name || SHIFT_LABELS[s.type] || s.type;
    if (await notify(s.userId, "event", "You're on duty today", `${label} shift today (${today}).`)) notified++;
  }

  return NextResponse.json({ date: today, shifts: shifts.length, notified });
}
