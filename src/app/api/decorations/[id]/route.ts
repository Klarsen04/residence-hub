import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.decoration.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "You can only edit your own decorations" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, type, category, imageUrl, fileUrl, instructions, costEstimate, materials } = body;

  if (title !== undefined && !title) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (type !== undefined) data.type = type;
  if (category !== undefined) data.category = category;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (fileUrl !== undefined) data.fileUrl = fileUrl;
  if (instructions !== undefined) data.instructions = instructions;
  if (costEstimate !== undefined) data.costEstimate = costEstimate;

  // Materials are replaced wholesale when provided.
  if (Array.isArray(materials)) {
    data.materials = {
      deleteMany: {},
      create: materials
        .filter((m: any) => m?.name?.trim())
        .map((m: any) => ({ name: m.name, quantity: m.quantity || null, cost: m.cost || null, url: m.url || null })),
    };
  }

  const decoration = await prisma.decoration.update({
    where: { id },
    data,
    include: { materials: true },
  });

  return NextResponse.json(decoration);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.decoration.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.decoration.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
