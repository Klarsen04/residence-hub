import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inspirations = await prisma.inspiration.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(inspirations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, url, imageUrl, source, category, tags } = body;

  if (!source) {
    return NextResponse.json({ message: "Source is required" }, { status: 400 });
  }

  const inspiration = await prisma.inspiration.create({
    data: {
      userId: session.user.id,
      title,
      url,
      imageUrl,
      source,
      category,
      tags: tags || [],
    },
  });

  return NextResponse.json(inspiration, { status: 201 });
}
