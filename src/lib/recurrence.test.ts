import { describe, it, expect } from "vitest";

import { addDays, daysBetween, expandRecurrence, parseDay, ymd, MAX_SERIES_SHIFTS } from "@/lib/recurrence";

describe("parseDay", () => {
  it("reads a valid day as local midnight", () => {
    const d = parseDay("2026-08-16")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(0);
  });

  it("rejects a day that doesn't exist", () => {
    // JS would silently roll this into March.
    expect(parseDay("2026-02-31")).toBeNull();
  });

  it("rejects anything that isn't YYYY-MM-DD", () => {
    expect(parseDay("16/08/2026")).toBeNull();
    expect(parseDay("2026-8-1")).toBeNull();
    expect(parseDay("")).toBeNull();
  });
});

describe("ymd", () => {
  it("zero-pads and stays in local time", () => {
    expect(ymd(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
  });

  it("crosses a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("daysBetween", () => {
  it("counts whole days", () => {
    expect(daysBetween("2026-08-16", "2026-08-23")).toBe(7);
  });

  it("survives a daylight-saving change", () => {
    // US DST ends 2026-11-01; that day is 25 hours long locally.
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });
});

describe("expandRecurrence", () => {
  it("returns just the start day when nothing repeats", () => {
    expect(expandRecurrence({ start: "2026-08-16" })).toEqual(["2026-08-16"]);
  });

  it("repeats on the chosen weekdays up to an end date", () => {
    // 2026-08-17 is a Monday. Mondays only, through the 31st.
    const days = expandRecurrence({ start: "2026-08-17", weekdays: [1], until: "2026-08-31" });
    expect(days).toEqual(["2026-08-17", "2026-08-24", "2026-08-31"]);
  });

  it("includes the end date itself", () => {
    const days = expandRecurrence({ start: "2026-08-17", weekdays: [1], until: "2026-08-24" });
    expect(days).toContain("2026-08-24");
  });

  it("falls back to a weeks window when there's no end date", () => {
    // Two weeks of Mondays starting on a Monday.
    const days = expandRecurrence({ start: "2026-08-17", weekdays: [1], weeks: 2 });
    expect(days).toEqual(["2026-08-17", "2026-08-24"]);
  });

  it("defaults to eight weeks when given neither", () => {
    const days = expandRecurrence({ start: "2026-08-17", weekdays: [1] });
    expect(days).toHaveLength(8);
  });

  it("always keeps the start day even if it isn't a chosen weekday", () => {
    // 2026-08-16 is a Sunday; repeating on Mondays shouldn't drop it.
    const days = expandRecurrence({ start: "2026-08-16", weekdays: [1], until: "2026-08-24" });
    expect(days[0]).toBe("2026-08-16");
  });

  it("adds hand-picked dates on top of the pattern", () => {
    const days = expandRecurrence({
      start: "2026-08-17",
      weekdays: [1],
      until: "2026-08-24",
      extraDates: ["2026-09-05"],
    });
    expect(days).toEqual(["2026-08-17", "2026-08-24", "2026-09-05"]);
  });

  it("accepts hand-picked dates with no weekly pattern at all", () => {
    const days = expandRecurrence({ start: "2026-08-16", extraDates: ["2026-08-20", "2026-08-18"] });
    expect(days).toEqual(["2026-08-16", "2026-08-18", "2026-08-20"]);
  });

  it("de-duplicates a picked date that the pattern already covers", () => {
    const days = expandRecurrence({
      start: "2026-08-17",
      weekdays: [1],
      until: "2026-08-24",
      extraDates: ["2026-08-24"],
    });
    expect(days).toEqual(["2026-08-17", "2026-08-24"]);
  });

  it("rejects an end date before the start", () => {
    expect(() => expandRecurrence({ start: "2026-08-17", weekdays: [1], until: "2026-08-10" })).toThrow(/on or after/);
  });

  it("rejects an invalid start, end, or picked date", () => {
    expect(() => expandRecurrence({ start: "nope" })).toThrow(/start date/);
    expect(() => expandRecurrence({ start: "2026-08-17", weekdays: [1], until: "nope" })).toThrow(/end date/);
    expect(() => expandRecurrence({ start: "2026-08-17", extraDates: ["nope"] })).toThrow(/isn't a valid date/);
  });

  it("refuses a repeat running more than a year out", () => {
    expect(() => expandRecurrence({ start: "2026-01-01", weekdays: [1], until: "2027-06-01" })).toThrow(/year ahead/);
  });

  it("refuses a repeat that would create too many shifts", () => {
    // The weekday path is already bounded by the one-year window, so the count
    // cap is what guards hand-picked dates, which have no window at all.
    const many = Array.from({ length: MAX_SERIES_SHIFTS + 1 }, (_, i) => addDays("2026-01-01", i));
    expect(() => expandRecurrence({ start: "2026-01-01", extraDates: many })).toThrow(
      new RegExp(String(MAX_SERIES_SHIFTS)),
    );
  });

  it("allows a full year of daily shifts, which the window still bounds", () => {
    const days = expandRecurrence({ start: "2026-01-01", weekdays: [0, 1, 2, 3, 4, 5, 6], until: "2026-12-31" });
    expect(days).toHaveLength(365);
  });

  it("ignores weekday numbers outside 0-6", () => {
    const days = expandRecurrence({ start: "2026-08-16", weekdays: [9, -1], until: "2026-08-31" });
    expect(days).toEqual(["2026-08-16"]);
  });
});
