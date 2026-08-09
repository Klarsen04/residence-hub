import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChat, AIPlannerError, type ChatMessage } from "@/lib/aiPlanner";
import { getLimitStatus, recordUsage, limitMessage } from "@/lib/aiLimits";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "You are a warm, practical Residence Life event-planning assistant for a college RA. " +
  "Help brainstorm and plan floor programs: event ideas, budgets and shopping lists, timelines, " +
  "marketing, setup/cleanup, and inclusivity. Be concrete and budget-conscious. Use clear Markdown " +
  "with short headings and lists. When the user gives constraints (budget, audience, goal, headcount), " +
  "tailor to them and offer alternatives. Keep a friendly, encouraging tone.";

// GET ?id= — return a conversation's messages (owner only).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo || convo.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(convo);
}

// POST { conversationId?, message } — append a user turn, generate a reply with
// full history, persist both, and return { conversationId, reply }.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, message } = await req.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Rate limit — fail open if usage tables aren't reachable.
  try {
    const status = await getLimitStatus(session.user.id, session.user.role);
    if (status.blocked) return NextResponse.json({ error: limitMessage(status) }, { status: 429 });
  } catch (e) {
    console.error("AI limit check skipped:", e);
  }

  // Resolve or create the conversation (owner-checked).
  let convo = conversationId
    ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;
  if (convo && convo.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!convo) {
    const created = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        // Title the chat from the first message (trimmed).
        title: message.trim().slice(0, 60),
      },
    });
    convo = { ...created, messages: [] };
  }

  // Persist the user's turn.
  await prisma.message.create({
    data: { conversationId: convo.id, role: "user", content: message.trim() },
  });

  // Build the model input: system + prior turns + this one.
  const history: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...convo.messages.map((m) => ({ role: m.role as ChatMessage["role"], content: m.content })),
    { role: "user", content: message.trim() },
  ];

  try {
    const { text: reply } = await generateChat(history);
    await prisma.message.create({
      data: { conversationId: convo.id, role: "assistant", content: reply },
    });
    await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
    try {
      await recordUsage(session.user.id);
    } catch (e) {
      console.error("AI usage record skipped:", e);
    }
    return NextResponse.json({ conversationId: convo.id, reply });
  } catch (error: unknown) {
    const isConfig = error instanceof AIPlannerError && error.status === 503;
    return NextResponse.json(
      {
        error: isConfig
          ? "AI planner isn't configured yet. Add an AI provider API key."
          : "The assistant is busy right now — please try again in a moment.",
        conversationId: convo.id,
      },
      { status: isConfig ? 503 : 502 }
    );
  }
}
