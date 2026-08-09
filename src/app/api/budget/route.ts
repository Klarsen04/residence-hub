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
      event: { select: { title: true, date: true } },
      items: true,
      expenses: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, amount, eventId, items } = await req.json();

  if (!title || !amount) {
    return NextResponse.json({ error: "Title and amount are required" }, { status: 400 });
  }

  const request = await prisma.budgetRequest.create({
    data: {
      title,
      description,
      amount: parseFloat(amount),
      userId: session.user.id,
      ...(eventId && { eventId }),
      ...(items?.length && {
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            quantity: parseInt(item.quantity) || 1,
            unitCost: parseFloat(item.unitCost) || 0,
            vendor: item.vendor || null,
            url: item.url || null,
            notes: item.notes || null,
          })),
        },
      }),
    },
    include: { items: true },
  });

  return NextResponse.json(request);
}
