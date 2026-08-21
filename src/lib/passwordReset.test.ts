import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  RESET_TOKEN_TTL_MS,
  createRawToken,
  hashToken,
  normalizeEmail,
  passwordProblem,
  resetLink,
  tokenProblem,
  tokenState,
} from "./passwordReset";

describe("createRawToken", () => {
  it("is long enough to be unguessable", () => {
    // 32 random bytes as hex.
    expect(createRawToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never repeats itself", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => createRawToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("hashToken", () => {
  it("gives the same hash for the same token, so lookup by hash works", () => {
    const token = createRawToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("gives different hashes for different tokens", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("does not contain the token it came from", () => {
    const token = createRawToken();
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("resetLink", () => {
  it("points at the reset page with the token attached", () => {
    expect(resetLink("https://hub.example.com", "abc123")).toBe(
      "https://hub.example.com/reset-password?token=abc123",
    );
  });

  it("does not double the slash when the origin has a trailing one", () => {
    expect(resetLink("https://hub.example.com/", "abc")).toBe(
      "https://hub.example.com/reset-password?token=abc",
    );
    expect(resetLink("http://localhost:3000///", "abc")).toBe(
      "http://localhost:3000/reset-password?token=abc",
    );
  });
});

describe("tokenState", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  const later = new Date(now.getTime() + RESET_TOKEN_TTL_MS);

  it("is valid while unspent and unexpired", () => {
    expect(tokenState({ expiresAt: later, usedAt: null }, now)).toBe("valid");
  });

  it("is expired once the deadline passes", () => {
    const past = new Date(now.getTime() - 1000);
    expect(tokenState({ expiresAt: past, usedAt: null }, now)).toBe("expired");
  });

  it("counts the exact expiry moment as expired", () => {
    expect(tokenState({ expiresAt: now, usedAt: null }, now)).toBe("expired");
  });

  it("is used once spent, even with time left on it", () => {
    expect(tokenState({ expiresAt: later, usedAt: now }, now)).toBe("used");
  });

  it("reports used rather than expired for a spent, stale ticket", () => {
    const past = new Date(now.getTime() - RESET_TOKEN_TTL_MS);
    expect(tokenState({ expiresAt: past, usedAt: past }, now)).toBe("used");
  });

  it("accepts the string dates a JSON round-trip leaves behind", () => {
    expect(tokenState({ expiresAt: later.toISOString(), usedAt: null }, now)).toBe("valid");
    expect(tokenState({ expiresAt: later.toISOString(), usedAt: now.toISOString() }, now)).toBe("used");
  });

  it("treats a missing usedAt the same as null", () => {
    expect(tokenState({ expiresAt: later }, now)).toBe("valid");
  });
});

describe("tokenProblem", () => {
  it("says nothing is wrong with a valid ticket", () => {
    expect(tokenProblem("valid")).toBeNull();
  });

  it("explains a used link and points at getting another", () => {
    expect(tokenProblem("used")).toMatch(/already been used/i);
    expect(tokenProblem("used")).toMatch(/new one/i);
  });

  it("explains an expired link and points at getting another", () => {
    expect(tokenProblem("expired")).toMatch(/expired/i);
    expect(tokenProblem("expired")).toMatch(/new one/i);
  });
});

describe("passwordProblem", () => {
  it("accepts a long enough password", () => {
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    expect(passwordProblem("correct horse battery staple")).toBeNull();
  });

  it("rejects one that is too short", () => {
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(
      new RegExp(`${MIN_PASSWORD_LENGTH} characters`),
    );
  });

  it("rejects an empty or missing password", () => {
    expect(passwordProblem("")).toBe("Choose a new password");
    expect(passwordProblem(undefined)).toBe("Choose a new password");
    expect(passwordProblem(null)).toBe("Choose a new password");
  });

  it("rejects anything that isn't a string", () => {
    expect(passwordProblem(12345678)).toBe("Choose a new password");
    expect(passwordProblem({ password: "longenough" })).toBe("Choose a new password");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims, matching how accounts are keyed", () => {
    expect(normalizeEmail("  Admin@ResidenceHub.com \n")).toBe("admin@residencehub.com");
  });

  it("turns nothing into an empty string rather than throwing", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(null)).toBe("");
  });
});
