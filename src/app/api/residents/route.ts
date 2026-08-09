import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const residents = await prisma.resident.findMany({
    where: { userId: session.user.id },
    orderBy: { room: "asc" },
  });

  return NextResponse.json(residents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, room, phone, email, year, major, notes, moveInDate } = await req.json();

  if (!name || !room) {
    return NextResponse.json({ error: "Name and room required" }, { status: 400 });
  }

  const resident = await prisma.resident.create({
    data: {
      userId: session.user.id,
      name,
      room,
      phone,
      email,
      year,
      major,
      notes,
      moveInDate,
    },
  });

  return NextResponse.json(resident);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, room, phone, email, year, major, notes, flagged } = await req.json();

  const resident = await prisma.resident.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(room !== undefined && { room }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(year !== undefined && { year }),
      ...(major !== undefined && { major }),
      ...(notes !== undefined && { notes }),
      ...(flagged !== undefined && { flagged }),
    },
  });

  return NextResponse.json(resident);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.resident.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
