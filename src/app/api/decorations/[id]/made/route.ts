import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { imageUrl, notes } = body;

  const made = await prisma.decorationMade.create({
    data: {
      decorationId: id,
      userId: session.user.id,
      imageUrl: imageUrl || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(made, { status: 201 });
}
