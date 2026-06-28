import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.budgetRequest.findMany({
    where: { userId: session.user.id },
    include: {
      event: { select: { title: true } },
      items: true,
      expenses: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let hallBudget = null;
  if (session.user.hallId) {
    hallBudget = await prisma.budget.findFirst({
      where: { hallId: session.user.hallId },
      orderBy: { createdAt: "desc" },
    });
  }

  return NextResponse.json({ requests, hallBudget });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, amount, eventId, items } = body;

  if (!title || !amount) {
    return NextResponse.json({ message: "Title and amount are required" }, { status: 400 });
  }

  const request = await prisma.budgetRequest.create({
    data: {
      userId: session.user.id,
      title,
      description,
      amount,
      eventId,
      budgetId: session.user.hallId
        ? (await prisma.budget.findFirst({ where: { hallId: session.user.hallId }, orderBy: { createdAt: "desc" } }))?.id
        : undefined,
      items: items
        ? {
            create: items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity || 1,
              unitCost: item.unitCost,
              vendor: item.vendor,
              url: item.url,
              notes: item.notes,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });

  return NextResponse.json(request, { status: 201 });
}
