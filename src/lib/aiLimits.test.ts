import { describe, it, expect, vi } from "vitest";

// aiLimits imports the Prisma client at module load; the functions under test
// here are pure and never touch it, so we stub the module out.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { userDailyLimit, todayKey, limitMessage, type LimitStatus } from "@/lib/aiLimits";

describe("userDailyLimit", () => {
  it("gives admins unlimited", () => {
    expect(userDailyLimit("ADMIN")).toBe(Infinity);
  });

  it("uses per-role caps", () => {
    expect(userDailyLimit("RESIDENT_ASSISTANT")).toBe(10);
    expect(userDailyLimit("RHA_MEMBER")).toBe(5);
  });

  it("falls back to the default for unknown roles", () => {
    expect(userDailyLimit("SOMETHING_ELSE")).toBe(5);
  });
});

describe("todayKey", () => {
  it("formats a date as YYYY-MM-DD, zero-padded", () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("limitMessage", () => {
  const base: LimitStatus = {
    day: "2026-08-11",
    userUsed: 10,
    userLimit: 10,
    userRemaining: 0,
    globalUsed: 0,
    globalLimit: 1000,
    globalRemaining: 1000,
    isAdmin: false,
    blocked: true,
  };

  it("explains a per-user limit", () => {
    const msg = limitMessage({ ...base, reason: "user" });
    expect(msg).toMatch(/limit of 10/);
    expect(msg).toMatch(/resets tomorrow/i);
  });

  it("explains the shared global limit", () => {
    const msg = limitMessage({ ...base, reason: "global" });
    expect(msg).toMatch(/shared daily limit/i);
  });
});
