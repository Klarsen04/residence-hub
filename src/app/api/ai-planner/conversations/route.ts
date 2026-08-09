import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// List the current user's saved planning conversations (newest first).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json(conversations);
  } catch {
    // Tables not synced yet — return empty so the page still renders.
    return NextResponse.json([]);
  }
}

// Create a new (empty) conversation.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convo = await prisma.conversation.create({
    data: { userId: session.user.id, title: "New chat" },
  });
  return NextResponse.json(convo, { status: 201 });
}

// Delete a conversation (owner only).
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const c = await prisma.conversation.findUnique({ where: { id } });
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
