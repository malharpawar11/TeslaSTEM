import { schoolDayKey } from "@/lib/calendar";

/**
 * Arithmetic on school-day keys ("2026-11-09"). Keys already come from the
 * Pacific-time helpers in lib/calendar; noon UTC keeps this code clear of any
 * daylight-saving edge, and it never touches an event's actual timestamp.
 */
const at = (key: string) => new Date(`${key}T12:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);

export const todayKey = () => schoolDayKey(new Date().toISOString());

export const addDays = (key: string, days: number) => {
  const d = at(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
};

/** 0 = Monday … 6 = Sunday: the week as a school runs it. */
export const weekdayIndex = (key: string) => (at(key).getUTCDay() + 6) % 7;

export const mondayOf = (key: string) => addDays(key, -weekdayIndex(key));

/** On a weekend, "this week" at school means the one about to start. */
export const schoolWeekOf = (key: string) =>
  weekdayIndex(key) > 4 ? addDays(mondayOf(key), 7) : mondayOf(key);

export const addMonths = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  return toKey(new Date(Date.UTC(y, m - 1 + by, 1, 12))).slice(0, 7);
};

export const label = (
  key: string,
  options: Intl.DateTimeFormatOptions,
) => at(key).toLocaleDateString("en-US", { timeZone: "UTC", ...options });

export const monthGrid = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekdayIndex(first);
  return { lead, days, rows: Math.ceil((lead + days) / 7) };
};

export const dayOf = (key: string) => Number(key.slice(8));

/** Start time for the agenda's time column, in school time. */
export function startClock(iso: string) {
  const text = new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  });
  const [clock, meridiem] = text.split(/\s+/);
  return { clock, meridiem };
}
