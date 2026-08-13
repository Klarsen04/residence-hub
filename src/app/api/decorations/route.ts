import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decorations = await prisma.decoration.findMany({
    include: {
      user: { select: { name: true } },
      materials: true,
      _count: { select: { comments: true, favoritedBy: true, madeBy: true } },
      favoritedBy: { where: { userId: session.user.id }, select: { id: true } },
      madeBy: { select: { id: true, userId: true, imageUrl: true, user: { select: { name: true } } } },
    },
    orderBy: { favorites: "desc" },
  });

  return NextResponse.json(decorations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, type, category, imageUrl, fileUrl, instructions, costEstimate, materials } = body;

  if (!title || !type || !category) {
    return NextResponse.json({ message: "Title, type, and category are required" }, { status: 400 });
  }

  const decoration = await prisma.decoration.create({
    data: {
      userId: session.user.id,
      title,
      description,
      type,
      category,
      imageUrl,
      fileUrl,
      instructions,
      costEstimate,
      materials: materials?.length
        ? {
            create: materials.map((m: any) => ({
              name: m.name,
              quantity: m.quantity || null,
              cost: m.cost || null,
              url: m.url || null,
            })),
          }
        : undefined,
    },
    include: { materials: true },
  });

  return NextResponse.json(decoration, { status: 201 });
}
