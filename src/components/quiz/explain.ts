import {
  fitsAvailability,
  minutes,
  type Availability,
  type StudentPreferences,
} from "@/lib/discovery";
import type { Club } from "@/types/domain";

const AVAILABILITY_REASON = "Fits your availability";
const list = (items: string[]) =>
  items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

function clock(value: string) {
  const total = minutes(value);
  if (total === null) return { text: value, meridiem: "" };
  const hour = Math.floor(total / 60);
  return {
    text: `${hour % 12 || 12}:${String(total % 60).padStart(2, "0")}`,
    meridiem: hour < 12 ? "AM" : "PM",
  };
}

/** "3:00–4:00 PM". The stored value is left exactly as it was entered. */
export function windowTime(window: Availability) {
  if (window.period) return window.period;
  const from = clock(window.start);
  const until = clock(window.end);
  return from.meridiem === until.meridiem
    ? `${from.text}–${until.text} ${until.meridiem}`.trim()
    : `${from.text} ${from.meridiem}–${until.text} ${until.meridiem}`;
}

/** Turns the matcher's own reasons into a sentence. It never adds a reason. */
export function whyItMatches(reasons: string[]) {
  const interests = reasons
    .filter((r) => r.endsWith(" interest"))
    .map((r) => r.replace(/ interest$/, ""));
  const careers = reasons
    .filter((r) => !r.endsWith(" interest") && r !== AVAILABILITY_REASON)
    .map((r) => r.toLowerCase());
  const parts: string[] = [];
  if (interests.length) parts.push(`matches your ${list(interests)} interest`);
  if (careers.length)
    parts.push(
      `connects to your ${list(careers)} ${careers.length === 1 ? "goal" : "goals"}`,
    );
  if (!parts.length) return null;
  const sentence = parts.join(" and ");
  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}

/** Names the window the matcher accepted, using the matcher's own check. */
export function scheduleFit(
  club: Pick<Club, "day" | "time">,
  reasons: string[],
  preferences: StudentPreferences,
) {
  if (!reasons.includes(AVAILABILITY_REASON)) return null;
  const fitting = preferences.availability.filter((window) =>
    fitsAvailability(club, [window]),
  );
  if (!fitting.length) return "Fits your availability";
  const first = fitting[0];
  const when = first.period ? first.period.toLowerCase() : windowTime(first);
  const extra = fitting.length - 1;
  return `Fits your ${first.day} ${when}${extra ? ` and ${extra} more ${extra === 1 ? "time" : "times"}` : ""}`;
}
