import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resources = await prisma.resource.findMany({
    where: {
      OR: [{ isPublic: true }, { userId: session.user.id }],
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(resources);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, type, fileUrl, externalUrl, tags, isPublic } = body;

  if (!title || !type) {
    return NextResponse.json({ message: "Title and type are required" }, { status: 400 });
  }

  const resource = await prisma.resource.create({
    data: {
      userId: session.user.id,
      title,
      description,
      type,
      fileUrl,
      externalUrl,
      tags: tags || [],
      isPublic: isPublic ?? true,
    },
  });

  return NextResponse.json(resource, { status: 201 });
}
