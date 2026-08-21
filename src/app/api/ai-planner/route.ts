import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePlan, AIPlannerError } from "@/lib/aiPlanner";
import { getLimitStatus, recordUsage, limitMessage, todayKey } from "@/lib/aiLimits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fail open: if the usage tables aren't reachable, return a neutral status
  // so the planner page still renders instead of erroring.
  try {
    const status = await getLimitStatus(session.user.id, session.user.role);
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
  } catch {
    // Same shape as the success response so the client never sees missing keys.
    return NextResponse.json({
      used: 0,
      limit: null,
      remaining: null,
      day: todayKey(),
      isAdmin: session.user.role === "ADMIN",
      global: { used: 0, limit: null, remaining: null },
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fail OPEN on the rate-limit check: if the usage tables aren't reachable
  // (e.g. schema not yet synced), don't block generation — just skip limiting.
  let status: Awaited<ReturnType<typeof getLimitStatus>> | null = null;
  try {
    status = await getLimitStatus(session.user.id, session.user.role);
    if (status.blocked) {
      return NextResponse.json({ error: limitMessage(status) }, { status: 429 });
    }
  } catch (e) {
    console.error("AI limit check skipped (usage table unavailable):", e);
  }

  const body = await req.json();
  const { budget, audience, goal, attendance } = body;

  if (!budget || !audience || !goal || !attendance) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
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

    // Count usage only on success; never let a usage-write failure turn a
    // successful generation into an error.
    try {
      await recordUsage(session.user.id);
    } catch (e) {
      console.error("AI usage record skipped:", e);
    }

    // History save is best-effort: the plan was generated (and quota spent),
    // so a failed session write must not discard it.
    try {
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
    } catch (e) {
      console.error("AI planner session save skipped:", e);
    }

    const remaining = status && Number.isFinite(status.userRemaining)
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
