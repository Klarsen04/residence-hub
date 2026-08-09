import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mood, category, message, anonymous } = await req.json();

  if (!mood || !message) {
    return NextResponse.json({ error: "Mood and message required" }, { status: 400 });
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId: anonymous ? null : session.user.id,
      mood,
      category,
      message,
      anonymous: anonymous ?? true,
    },
  });

  return NextResponse.json(feedback);
}
