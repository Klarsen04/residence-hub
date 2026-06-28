import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

const DAILY_FREE_LIMIT = 1500;
const ADMIN_MONTHLY_LIMIT = 500;
const MIN_PER_USER = 5;

async function getUserMonthlyLimit(userId: string, role: string) {
  if (role === "ADMIN") return ADMIN_MONTHLY_LIMIT;

  const userCount = await prisma.user.count();
  const effectiveUsers = Math.max(userCount, 20);

  const perUserLimit = Math.max(
    MIN_PER_USER,
    Math.floor((DAILY_FREE_LIMIT * 30) / effectiveUsers)
  );

  return perUserLimit;
}

async function getUsageThisMonth(userId: string) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const usage = await prisma.aIUsage.findUnique({
    where: { userId_month: { userId, month } },
  });

  return { count: usage?.count || 0, month };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count, month } = await getUsageThisMonth(session.user.id);
  const limit = await getUserMonthlyLimit(session.user.id, session.user.role);
  const userCount = await prisma.user.count();

  return NextResponse.json({
    used: count,
    limit,
    remaining: Math.max(0, limit - count),
    month,
    totalUsers: userCount,
    isAdmin: session.user.role === "ADMIN",
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count, month } = await getUsageThisMonth(session.user.id);
  const limit = await getUserMonthlyLimit(session.user.id, session.user.role);

  if (count >= limit) {
    return NextResponse.json(
      { error: `You've reached your monthly limit of ${limit} AI requests. Resets next month.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { budget, audience, goal, attendance } = body;

  if (!budget || !audience || !goal || !attendance) {
    return NextResponse.json({ message: "All fields are required" }, { status: 400 });
  }

  const prompt = `You are a Residence Life event planning assistant. Generate a detailed event plan based on these inputs:

Budget: $${budget}
Target Audience: ${audience}
Programming Goal: ${goal}
Expected Attendance: ${attendance} residents

Provide your response in the following format:

## Event Concept
[Creative event name and 2-3 sentence description]

## Shopping List
[Itemized list with quantities and estimated costs]

## Timeline
[Hour-by-hour schedule from setup to cleanup]

## Marketing Plan
[3-4 specific promotional strategies]

## Setup Instructions
[Step-by-step setup checklist]

## Cleanup Checklist
[Post-event cleanup tasks]

## Estimated Total Cost
[Breakdown summary]

Be creative, practical, and budget-conscious. Suggest alternatives if the budget is tight.`;

  try {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    await prisma.aIUsage.upsert({
      where: { userId_month: { userId: session.user.id, month } },
      update: { count: { increment: 1 } },
      create: { userId: session.user.id, month, count: 1 },
    });

    await prisma.aIPlannerSession.create({
      data: {
        userId: session.user.id,
        budget: parseFloat(budget),
        audience,
        goal,
        attendance: parseInt(attendance),
        response,
      },
    });

    return NextResponse.json({ response, remaining: limit - count - 1 });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "AI generation failed. Please try again." },
      { status: 500 }
    );
  }
}
