import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendPasswordResetEmail } from "@/lib/email";
import {
  RESET_TOKEN_TTL_MS,
  createRawToken,
  hashToken,
  normalizeEmail,
  resetLink,
  tokenState,
} from "@/lib/passwordReset";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

/**
 * Outstanding reset requests, so an admin can see who's locked out.
 *
 * The links themselves aren't here and can't be: only their hashes are stored.
 * An admin helping someone issues a fresh link with POST, which is shown once.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await prisma.passwordResetToken.findMany({
    where: { usedAt: null },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pending = rows
    .filter((r) => tokenState(r) === "valid")
    .map((r) => ({
      id: r.id,
      name: r.user?.name || null,
      email: r.user?.email || null,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      // Who started it: the person themselves, or an admin issuing a link.
      selfService: r.createdBy === null,
    }));

  return NextResponse.json({ pending, emailConfigured: emailConfigured() });
}

/**
 * Issue a reset link for someone who can't get one themselves — no mail provider
 * set up, or they've lost access to their inbox. The raw link comes back exactly
 * once, in this response, for the admin to hand over.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter the person's email address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  // An admin already knows who's on the team, so naming a missing account here
  // gives nothing away that the Team page doesn't.
  if (!user) return NextResponse.json({ error: "No account with that email" }, { status: 404 });

  // One live link per person: issuing a new one retires anything outstanding,
  // including the request that prompted this.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = createRawToken();
  const created = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      createdBy: session!.user.id,
    },
  });

  const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const link = resetLink(origin, token);
  const emailed = user.email
    ? await sendPasswordResetEmail(user.email, link, RESET_TOKEN_TTL_MS / 60_000)
    : false;

  return NextResponse.json({ link, expiresAt: created.expiresAt, emailed }, { status: 201 });
}

/** Cancel an outstanding request — say, one the person didn't make. */
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { count } = await prisma.passwordResetToken.deleteMany({ where: { id, usedAt: null } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
