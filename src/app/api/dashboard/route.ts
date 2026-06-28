import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const events = await prisma.event.findMany({
    where: {
      date: { gte: now },
      OR: [
        { organizerId: session.user.id },
        { hallId: session.user.hallId || undefined },
        { coOrganizers: { some: { userId: session.user.id } } },
      ],
    },
    include: { hall: { select: { name: true } } },
    orderBy: { date: "asc" },
    take: 5,
  });

  let budget = { allocated: 0, used: 0, remaining: 0 };
  if (session.user.hallId) {
    const hallBudget = await prisma.budget.findFirst({
      where: { hallId: session.user.hallId },
      orderBy: { createdAt: "desc" },
    });
    if (hallBudget) {
      budget = {
        allocated: hallBudget.allocated,
        used: hallBudget.used,
        remaining: hallBudget.allocated - hallBudget.used,
      };
    }
  }

  const inspirations = await prisma.inspiration.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const resources = await prisma.resource.findMany({
    where: { OR: [{ isPublic: true }, { userId: session.user.id }] },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ events, budget, inspirations, resources });
}
