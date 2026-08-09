import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePlan, AIPlannerError } from "@/lib/aiPlanner";
import { getLimitStatus, recordUsage, limitMessage } from "@/lib/aiLimits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getLimitStatus(session.user.id, session.user.role);

  // `used`/`limit`/`remaining` keep the existing UI contract; the per-user daily
  // numbers drive the progress bar. Infinity (admins) serialises to null.
  return NextResponse.json({
    used: status.userUsed,
    limit: Number.isFinite(status.userLimit) ? status.userLimit : null,
    remaining: Number.isFinite(status.userRemaining) ? status.userRemaining : null,
    day: status.day,
    isAdmin: status.isAdmin,
    global: {
      used: status.globalUsed,
      limit: status.globalLimit || null,
      remaining: Number.isFinite(status.globalRemaining) ? status.globalRemaining : null,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getLimitStatus(session.user.id, session.user.role);
  if (status.blocked) {
    return NextResponse.json({ error: limitMessage(status) }, { status: 429 });
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
    // Rotates OpenRouter → NVIDIA → Gemini, failing over on limit/error.
    const { text: response } = await generatePlan(prompt);

    // Count usage only on success (both per-user and global daily counters).
    await recordUsage(session.user.id);

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

    const remaining = Number.isFinite(status.userRemaining)
      ? Math.max(0, status.userRemaining - 1)
      : null;
    return NextResponse.json({ response, remaining });
  } catch (error: unknown) {
    console.error("AI planner error:", error);
    const isConfig = error instanceof AIPlannerError && error.status === 503;
    return NextResponse.json(
      {
        error: isConfig
          ? "AI planner is not configured yet. Please add an AI provider API key."
          : "AI generation failed — all models were busy. Please try again in a moment.",
      },
      { status: isConfig ? 503 : 502 }
    );
  }
}
