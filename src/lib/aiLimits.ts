// AI planner rate limits.
//
// Two layers, both DAILY (matching how provider free-tier quotas reset):
//   1. Per-user daily cap, tiered by role.
//   2. Global app-wide daily cap — the real guard on the shared free quota, so
//      the whole platform can't blow the providers' daily limit at once.
//
// All numbers are env-configurable so they can be tuned without a redeploy.
// A limit of 0 or a role that resolves to Infinity means "unlimited".

import { prisma } from "@/lib/prisma";

// Per-user daily caps by role. ADMIN is effectively unlimited.
const PER_USER_DAILY: Record<string, number> = {
  ADMIN: Number(process.env.AI_LIMIT_ADMIN_DAILY) || Infinity,
  RESIDENT_ASSISTANT: Number(process.env.AI_LIMIT_RA_DAILY) || 10,
  RHA_MEMBER: Number(process.env.AI_LIMIT_RHA_DAILY) || 5,
};
const PER_USER_DEFAULT = Number(process.env.AI_LIMIT_DEFAULT_DAILY) || 5;

// App-wide daily cap across all users. Set below the providers' combined free
// daily quota with headroom: Gemini Flash-Lite ~1000/day + OpenRouter (50/day,
// or 1000/day after a one-time $10 credit purchase) + NVIDIA (~40 req/min, no
// hard daily cap), all with automatic rotation. 0 disables the global cap.
const GLOBAL_DAILY = Number(process.env.AI_LIMIT_GLOBAL_DAILY) || 1000;

export function userDailyLimit(role: string): number {
  return PER_USER_DAILY[role] ?? PER_USER_DEFAULT;
}

export function todayKey(now = new Date()): string {
  // Local server day. "YYYY-MM-DD".
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export interface LimitStatus {
  day: string;
  userUsed: number;
  userLimit: number; // Infinity for unlimited
  userRemaining: number;
  globalUsed: number;
  globalLimit: number; // 0 = disabled
  globalRemaining: number;
  isAdmin: boolean;
  blocked: boolean;
  reason?: "user" | "global";
}

/** Read-only snapshot of the caller's current limit status (for GET / UI). */
export async function getLimitStatus(userId: string, role: string): Promise<LimitStatus> {
  const day = todayKey();
  const [usage, global] = await Promise.all([
    prisma.aIUsage.findUnique({ where: { userId_day: { userId, day } } }),
    prisma.globalAIUsage.findUnique({ where: { day } }),
  ]);

  const userUsed = usage?.count ?? 0;
  const globalUsed = global?.count ?? 0;
  const userLimit = userDailyLimit(role);
  const isAdmin = role === "ADMIN";

  // Admins bypass the global cap too (so an admin can always demo/debug).
  const userBlocked = userUsed >= userLimit;
  const globalBlocked = !isAdmin && GLOBAL_DAILY > 0 && globalUsed >= GLOBAL_DAILY;

  return {
    day,
    userUsed,
    userLimit,
    userRemaining: userLimit === Infinity ? Infinity : Math.max(0, userLimit - userUsed),
    globalUsed,
    globalLimit: GLOBAL_DAILY,
    globalRemaining: GLOBAL_DAILY > 0 ? Math.max(0, GLOBAL_DAILY - globalUsed) : Infinity,
    isAdmin,
    blocked: userBlocked || globalBlocked,
    reason: userBlocked ? "user" : globalBlocked ? "global" : undefined,
  };
}

/** Increment both counters after a successful generation. */
export async function recordUsage(userId: string): Promise<void> {
  const day = todayKey();
  await Promise.all([
    prisma.aIUsage.upsert({
      where: { userId_day: { userId, day } },
      update: { count: { increment: 1 } },
      create: { userId, day, count: 1 },
    }),
    prisma.globalAIUsage.upsert({
      where: { day },
      update: { count: { increment: 1 } },
      create: { day, count: 1 },
    }),
  ]);
}

/** Human-readable message when a request is blocked. */
export function limitMessage(status: LimitStatus): string {
  if (status.reason === "user") {
    return `You've reached today's limit of ${status.userLimit} AI plans. It resets tomorrow.`;
  }
  return "The AI planner has hit its shared daily limit for everyone. Please try again tomorrow.";
}
