import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(150)).toBe("$150.00");
  });

  it("formats cents and thousands separators", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });
});

describe("formatDate", () => {
  it("includes the year and a short month", () => {
    const out = formatDate("2026-06-15T12:00:00Z");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/Jun/);
  });
});
