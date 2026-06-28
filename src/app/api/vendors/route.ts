import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendors = await prisma.vendor.findMany({
    include: {
      reviews: { select: { rating: true } },
      _count: { select: { events: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, category, contact, email, phone, website, notes, costRange } = body;

  if (!name || !category) {
    return NextResponse.json({ message: "Name and category are required" }, { status: 400 });
  }

  const vendor = await prisma.vendor.create({
    data: { name, category, contact, email, phone, website, notes, costRange },
  });

  return NextResponse.json(vendor, { status: 201 });
}
