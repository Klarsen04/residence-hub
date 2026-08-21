import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken, passwordProblem, tokenProblem, tokenState } from "@/lib/passwordReset";

const UNKNOWN = "This reset link isn't valid. Ask for a new one.";

/** Lets the reset page say the link is dead before anyone types a new password. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, error: UNKNOWN });

  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row) return NextResponse.json({ valid: false, error: UNKNOWN });

  const problem = tokenProblem(tokenState(row));
  return NextResponse.json(problem ? { valid: false, error: problem } : { valid: true });
}

/** Spend the ticket: set the new password and burn the link behind it. */
export async function POST(req: NextRequest) {
  let token: unknown;
  let password: unknown;
  try {
    ({ token, password } = await req.json());
  } catch {
    return NextResponse.json({ error: UNKNOWN }, { status: 400 });
  }

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: UNKNOWN }, { status: 400 });
  }

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row) return NextResponse.json({ error: UNKNOWN }, { status: 400 });

  const state = tokenState(row);
  const stateProblem = tokenProblem(state);
  if (stateProblem) return NextResponse.json({ error: stateProblem }, { status: 400 });

  const hashed = await bcrypt.hash(password as string, 12);

  // Mark it spent first, and only for a ticket still unspent — two submissions of
  // the same link can't both go through.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: tokenProblem("used") }, { status: 400 });
  }

  await prisma.user.update({ where: { id: row.userId }, data: { password: hashed } });

  // Any other outstanding ticket for this account is now moot.
  await prisma.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } });

  return NextResponse.json({ ok: true });
}
