/**
 * Works out which days a repeating duty shift lands on.
 *
 * Shared by the API and the duty panel so the count shown before you save is
 * the count you actually get.
 *
 * Dates are plain "YYYY-MM-DD" strings throughout — the same shape the DutyShift
 * column stores. Everything is computed in local time, because a shift on the
 * 16th means the 16th wherever the RA is, not whatever UTC says.
 */

/** Ceiling on one repeat, so a stray end date can't fill the calendar. */
export const MAX_SERIES_SHIFTS = 400;
/** How far ahead a repeat may run. */
export const MAX_SERIES_DAYS = 366;
/** Weeks covered when a repeat gives weekdays but no end date. */
export const DEFAULT_WEEKS = 8;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" for a Date, read in local time. */
export function ymd(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Parses "YYYY-MM-DD" as local midnight. Returns null if it isn't a real date. */
export function parseDay(day: string): Date | null {
  if (!DAY_RE.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects things like 2026-02-31, which JS would roll into March.
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** Adds `n` days to a day string. */
export function addDays(day: string, n: number): string {
  const base = parseDay(day);
  if (!base) return day;
  base.setDate(base.getDate() + n);
  return ymd(base);
}

export interface RecurrenceInput {
  /** The shift's own date; always included. */
  start: string;
  /** Weekdays to repeat on, 0 = Sunday. Empty means no weekly repeat. */
  weekdays?: number[];
  /** Last day the repeat may reach. Wins over `weeks` when given. */
  until?: string;
  /** Fallback window when there's no end date. */
  weeks?: number;
  /** One-off dates picked by hand, added on top of the weekly pattern. */
  extraDates?: string[];
}

/**
 * Returns the sorted, de-duplicated list of days to create.
 * Throws with a message meant for the user if the input doesn't make sense.
 */
export function expandRecurrence({ start, weekdays = [], until, weeks, extraDates = [] }: RecurrenceInput): string[] {
  if (!parseDay(start)) throw new Error("That start date isn't valid.");

  const days = new Set<string>([start]);

  // Hand-picked dates are independent of the weekly pattern — you can have one
  // without the other, or both.
  for (const raw of extraDates) {
    if (!raw) continue;
    if (!parseDay(raw)) throw new Error(`"${raw}" isn't a valid date.`);
    days.add(raw);
  }

  const validWeekdays = weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

  if (validWeekdays.length > 0) {
    let lastDay: string;
    if (until) {
      if (!parseDay(until)) throw new Error("That end date isn't valid.");
      if (until < start) throw new Error("The end date has to be on or after the start date.");
      lastDay = until;
    } else {
      lastDay = addDays(start, (weeks && weeks > 0 ? weeks : DEFAULT_WEEKS) * 7 - 1);
    }

    const span = daysBetween(start, lastDay);
    if (span > MAX_SERIES_DAYS) {
      throw new Error(`A repeat can only run a year ahead — pick an end date within ${MAX_SERIES_DAYS} days.`);
    }

    const cursor = parseDay(start)!;
    for (let i = 0; i <= span; i++) {
      if (validWeekdays.includes(cursor.getDay())) days.add(ymd(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  if (days.size > MAX_SERIES_SHIFTS) {
    throw new Error(`That would create ${days.size} shifts — keep a single repeat under ${MAX_SERIES_SHIFTS}.`);
  }

  // Sorting works lexically because the format is fixed-width and zero-padded.
  return [...days].sort();
}

/** Whole days from `from` to `to`, ignoring clock time. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
