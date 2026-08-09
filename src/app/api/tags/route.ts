import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Default palette — a tag's name defaults to its colour's name but is renamable.
const DEFAULT_TAGS = [
  { name: "Sage", color: "#3f6b52" },
  { name: "Terracotta", color: "#c05f3c" },
  { name: "Ochre", color: "#d99a3e" },
  { name: "Sky", color: "#5b8fb0" },
  { name: "Plum", color: "#7a5b7e" },
  { name: "Clay", color: "#9c5a3c" },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  // Seed the default colour tags on first use so there's always a palette.
  if (tags.length === 0) {
    await prisma.tag.createMany({
      data: DEFAULT_TAGS.map((t) => ({ ...t, userId: session.user.id })),
    });
    tags = await prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
  }

  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color, kind } = await req.json();
  if (!name || !color) {
    return NextResponse.json({ error: "Name and color required" }, { status: 400 });
  }

  const tag = await prisma.tag.create({
    data: { userId: session.user.id, name, color, kind: kind || "any" },
  });
  return NextResponse.json(tag, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, color } = await req.json();
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(color !== undefined && { color }) },
  });
  return NextResponse.json(tag);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
