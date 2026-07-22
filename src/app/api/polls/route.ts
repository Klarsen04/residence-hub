import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const polls = await prisma.poll.findMany({
    include: { votes: true, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const userId = session.user.id;
  const formatted = polls.map((poll) => {
    const options = JSON.parse(poll.options) as { id: string; text: string }[];
    const voteCounts = options.map((opt) => ({
      ...opt,
      votes: poll.votes.filter((v) => v.optionId === opt.id).length,
    }));
    const userVote = poll.votes.find((v) => v.userId === userId);
    return {
      id: poll.id,
      question: poll.question,
      active: poll.active,
      createdAt: poll.createdAt,
      createdBy: poll.user.name,
      options: voteCounts,
      totalVotes: poll.votes.length,
      votedOption: userVote?.optionId || null,
    };
  });

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, options } = await req.json();
  if (!question || !options || options.length < 2) {
    return NextResponse.json({ error: "Question and at least 2 options required" }, { status: 400 });
  }

  const optionsData = options.map((text: string, i: number) => ({ id: String(i), text }));

  const poll = await prisma.poll.create({
    data: {
      userId: session.user.id,
      question,
      options: JSON.stringify(optionsData),
    },
  });

  return NextResponse.json(poll);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pollId, optionId } = await req.json();

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already voted" }, { status: 400 });

  const vote = await prisma.pollVote.create({
    data: { pollId, userId: session.user.id, optionId },
  });

  return NextResponse.json(vote);
}
