import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const SHIFT_LABELS: Record<string, string> = { evening: "Evening", overnight: "Overnight", weekend: "Weekend" };

// Invoked by Vercel Cron (see vercel.json). Emails every RA who has a duty
// shift *today* a reminder. Secured with CRON_SECRET when set (Vercel sends it
// as `Authorization: Bearer <CRON_SECRET>`); open in local dev so it's testable.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const shifts = await prisma.dutyShift.findMany({
    where: { date: today },
    include: { user: { select: { name: true, email: true } }, tag: { select: { name: true } } },
  });

  let emailed = 0;
  for (const s of shifts) {
    if (!s.user?.email) continue;
    const label = s.title || s.tag?.name || SHIFT_LABELS[s.type] || s.type;
    const res = await sendEmail({
      to: s.user.email,
      subject: `Reminder: you're on duty today (${label})`,
      html: `<p>Hi ${s.user.name || "there"},</p>
<p>This is a reminder that you're scheduled for a <strong>${label}</strong> duty shift <strong>today (${today})</strong>.</p>
<p>Have a good shift!</p>`,
    });
    if (res.sent) emailed++;
  }

  return NextResponse.json({ date: today, shifts: shifts.length, emailed });
}
