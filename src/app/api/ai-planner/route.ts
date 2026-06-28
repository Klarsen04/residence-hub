import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });

  const response = completion.choices[0]?.message?.content || "";

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

  return NextResponse.json({ response });
}
