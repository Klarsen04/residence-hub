import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Weekly digest (Vercel Cron): emails each RA the list of their residents who
// haven't had a check-in in the last 7 days. Secured with CRON_SECRET when set.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [residents, recent] = await Promise.all([
    prisma.resident.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.checkIn.findMany({
      where: { createdAt: { gte: weekAgo }, residentId: { not: null } },
      select: { residentId: true },
    }),
  ]);

  const checkedRecently = new Set(recent.map((c) => c.residentId));

  // Group overdue residents by their owning RA.
  const byOwner = new Map<string, { name: string; email: string | null; residents: string[] }>();
  for (const r of residents) {
    if (checkedRecently.has(r.id)) continue;
    const key = r.userId;
    if (!byOwner.has(key)) byOwner.set(key, { name: r.user?.name || "RA", email: r.user?.email ?? null, residents: [] });
    byOwner.get(key)!.residents.push(`${r.name}${r.room ? ` (Rm ${r.room})` : ""}`);
  }

  let emailed = 0;
  for (const { name, email, residents: list } of byOwner.values()) {
    if (!email || list.length === 0) continue;
    const items = list.map((n) => `<li>${n}</li>`).join("");
    const res = await sendEmail({
      to: email,
      subject: `Weekly check-in digest — ${list.length} resident${list.length === 1 ? "" : "s"} due`,
      html: `<p>Hi ${name},</p>
<p>These residents on your floor haven't had a check-in in the last 7 days:</p>
<ul>${items}</ul>
<p>Log a quick 1:1 when you get a chance. Thanks!</p>`,
    });
    if (res.sent) emailed++;
  }

  return NextResponse.json({ owners: byOwner.size, emailed });
}
