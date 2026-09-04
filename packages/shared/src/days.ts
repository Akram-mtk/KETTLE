/**
 * A "day" is always a local calendar day serialised as YYYY-MM-DD.
 * Never derive one from `toISOString()` — that converts to UTC and silently
 * shifts entries into the previous/next day depending on the timezone.
 */
export type Day = string;

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(value: string): value is Day {
  return DAY_RE.test(value);
}

/** Local calendar day for a Date (defaults to now). */
export function toDay(date: Date = new Date()): Day {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today(): Day {
  return toDay();
}

/** Parse a day into a local Date at midnight. */
export function fromDay(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function addDays(day: Day, delta: number): Day {
  const date = fromDay(day);
  date.setDate(date.getDate() + delta);
  return toDay(date);
}

export function isToday(day: Day): boolean {
  return day === today();
}
