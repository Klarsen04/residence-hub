/**
 * Password recovery rules.
 *
 * A reset is a single-use ticket with a short life. The token in the link is
 * random and long; the database only ever holds its SHA-256, so a leaked table
 * can't be turned into account access. Everything here is deliberately free of
 * Prisma and NextAuth so the rules can be tested on their own.
 */

import crypto from "crypto";

/** How long a reset link stays good for. Long enough to read an email, no longer. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Most reset tickets a person can rack up in this window before we stop minting them. */
export const RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
export const RESET_REQUESTS_PER_WINDOW = 3;

/** Same floor the registration form enforces, so the two can't disagree. */
export const MIN_PASSWORD_LENGTH = 8;

/** The secret that travels in the link. Never stored. */
export function createRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** What gets stored. Same input always gives the same hash, so lookup is a plain query. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function resetLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/reset-password?token=${token}`;
}

export type TokenState = "valid" | "expired" | "used";

/** Whether a stored ticket can still be spent. */
export function tokenState(
  token: { expiresAt: Date | string; usedAt?: Date | string | null },
  now: Date = new Date(),
): TokenState {
  if (token.usedAt) return "used";
  return new Date(token.expiresAt).getTime() <= now.getTime() ? "expired" : "valid";
}

/** Why a token can't be used, in words the reset page can show as-is. */
export function tokenProblem(state: TokenState): string | null {
  if (state === "used") return "This reset link has already been used. Ask for a new one.";
  if (state === "expired") return "This reset link has expired. Ask for a new one.";
  return null;
}

/** Why a chosen password isn't acceptable, or null when it is. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length === 0) return "Choose a new password";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

/** Auth keys people by lowercase email, so every lookup has to normalize the same way. */
export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}
