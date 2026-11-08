import type { AppNotification, NotificationType } from "@/types/domain";

export type AlertKind = "request" | "meeting" | "resource" | "decision";

/** The types the inbox actually returns; announcements live on Canvas. */
const KIND: Partial<Record<NotificationType, AlertKind>> = {
  join_request: "request",
  board_request: "request",
  event_created: "meeting",
  event_updated: "meeting",
  event_cancelled: "meeting",
  event_reminder: "meeting",
  file_uploaded: "resource",
  note_posted: "resource",
  membership_approved: "decision",
  board_approved: "decision",
  board_rejected: "decision",
  club_approved: "decision",
  club_rejected: "decision",
};

export const kindOf = (n: AppNotification): AlertKind =>
  KIND[n.type] ?? "resource";

export interface EventFacts {
  month: string;
  day: string;
  time: string | null;
  place: string | null;
}

/**
 * Event alerts are written by a database trigger as
 * "Nov 09, 2026 at 03:30 PM · RM 117", already in Pacific time. Reading that
 * text means nothing is re-derived or shifted here.
 */
export function eventFacts(body: string | null): EventFacts | null {
  if (!body) return null;
  const match = body.match(
    /^([A-Z][a-z]{2}) (\d{1,2}), \d{4}(?: at (\d{1,2}:\d{2} [AP]M))?(?: · (.+))?$/,
  );
  if (!match) return null;
  return {
    month: match[1],
    day: String(Number(match[2])),
    time: match[3] ? match[3].replace(/^0/, "") : null,
    place: match[4] ?? null,
  };
}

/** The trigger prefixes titles; the feed shows that information separately. */
export function plainTitle(n: AppNotification, clubName?: string) {
  let title = n.title.replace(/^(Cancelled|Updated)\s+[—-]\s+/, "");
  if (clubName && title.startsWith(`${clubName}: `))
    title = title.slice(clubName.length + 2);
  else if (n.type === "event_created") title = title.replace(/^[^:]+:\s+/, "");
  return title;
}

export interface FeedEntry {
  key: string;
  kind: AlertKind;
  /** More than one when a recurring meeting was scheduled in one go. */
  items: AppNotification[];
  title: string;
}

export interface FeedDay {
  key: string;
  label: string;
  entries: FeedEntry[];
}

const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(
    new Date(iso),
  );

function dayLabel(key: string, today: string) {
  const at = (k: string) => Date.parse(`${k}T12:00:00Z`);
  const diff = Math.round((at(today) - at(key)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    ...(diff < 7 ? { weekday: "long" } : { month: "short", day: "numeric" }),
  });
}

/**
 * Groups by the day each alert arrived. A batch of the same meeting from the
 * same club folds into one entry that still holds every occurrence.
 */
export function buildFeed(
  list: AppNotification[],
  nameOf: (n: AppNotification) => string | undefined,
  oldestFirst: boolean,
): FeedDay[] {
  const today = dayKey(new Date().toISOString());
  const days = new Map<string, Map<string, FeedEntry>>();
  for (const n of list) {
    const key = dayKey(n.createdAt);
    const kind = kindOf(n);
    const title = plainTitle(n, nameOf(n));
    const groupKey =
      kind === "meeting" ? `${n.clubId}|${n.type}|${title}` : `single|${n.id}`;
    if (!days.has(key)) days.set(key, new Map());
    const entries = days.get(key)!;
    const existing = entries.get(groupKey);
    if (existing) existing.items.push(n);
    else entries.set(groupKey, { key: groupKey, kind, items: [n], title });
  }
  const direction = oldestFirst ? 1 : -1;
  return [...days.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]) * direction)
    .map(([key, entries]) => ({
      key,
      label: dayLabel(key, today),
      entries: oldestFirst
        ? [...entries.values()].reverse()
        : [...entries.values()],
    }));
}
