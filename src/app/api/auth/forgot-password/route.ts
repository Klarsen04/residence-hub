import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendPasswordResetEmail } from "@/lib/email";
import {
  RESET_REQUESTS_PER_WINDOW,
  RESET_REQUEST_WINDOW_MS,
  RESET_TOKEN_TTL_MS,
  createRawToken,
  hashToken,
  normalizeEmail,
  resetLink,
} from "@/lib/passwordReset";

/**
 * Ask for a password reset.
 *
 * Always answers the same way, whether or not the address belongs to an account
 * — otherwise this endpoint would tell a stranger who has one. What comes back
 * says only whether email is set up at all, which is a fact about the
 * deployment, so the page can either promise an email or point at an admin.
 */
export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalized = normalizeEmail(email);
  const configured = emailConfigured();
  const answer = NextResponse.json({ ok: true, emailConfigured: configured });

  if (!normalized.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
  if (!user) return answer;

  // Rate limit per account, so this can't be used to bury someone in email or to
  // pile up live tickets against their name.
  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - RESET_REQUEST_WINDOW_MS) } },
  });
  if (recent >= RESET_REQUESTS_PER_WINDOW) return answer;

  // Any earlier ticket the person hasn't spent is dropped: the newest link is
  // the only one that works.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = createRawToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  if (configured) {
    const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    await sendPasswordResetEmail(normalized, resetLink(origin, token), RESET_TOKEN_TTL_MS / 60_000);
  }

  return answer;
}
