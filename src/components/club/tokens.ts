/**
 * Layout, type and motion for individual club pages only. Nothing outside
 * `src/components/club` and `app/club/[id]/index.tsx` should import these.
 * Colour still comes from the site's tokens. See "Club pages" in DESIGN.md.
 */
export const CLUB = {
  contentMax: 1040,
  readingWidth: 700,
  dateColumn: 56,
  /** Vertical rhythm between the parts of a tab. */
  section: 40,
  block: 24,
  tabMs: 200,
  panelMs: 170,
  feedbackMs: 2600,
} as const;

/** 340 to 380px wide, scaling with the window. */
export const clubPaneWidth = (contentWidth: number) =>
  Math.round(Math.min(380, Math.max(340, contentWidth * 0.3)));
export const CLUB_PANE_PADDING = 24;

/** The information panel's sizes, in one place. */
export const PANEL_TYPE = {
  weekday: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  dayDisplay: 30,
  timeLabel: { fontSize: 14, lineHeight: 24, fontWeight: "700" },
  timeDisplay: 19,
  factLabel: { fontSize: 13, lineHeight: 22 },
  factValue: { fontSize: 15, lineHeight: 22 },
  alertsDisplay: 20,
  alertLabel: { fontSize: 14, lineHeight: 20 },
  alertState: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  button: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
} as const;

/** Spacing inside the panel. */
export const PANEL_SPACE = {
  section: 24,
  aroundButton: 18,
  factColumn: 112,
  factRow: 46,
  buttonHeight: 42,
} as const;

/** Sized by how long the name is, so "FBLA" and a 36-letter name both sit well. */
export function clubNameSize(name: string, phone: boolean) {
  const steps = phone ? [46, 40, 34] : [64, 54, 44];
  return name.length <= 18 ? steps[0] : name.length <= 28 ? steps[1] : steps[2];
}

/** Heading sizes for entries inside tabs. */
export const ENTRY = { lead: 20, standard: 17, small: 16 } as const;

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

/** A club's first sentence reads as a lead when the rest can stand alone. */
export function splitLead(text: string): [string, string | null] {
  const match = text.match(/^(.{40,}?[.!?])\s+([A-Z].{39,})$/s);
  return match ? [match[1], match[2]] : [text, null];
}

/** "A lunch: 11:15–11:45 AM; B lunch: 12:15–12:45 PM" as separate lines. */
export function meetingTimes(time: string) {
  return time
    .split(/;\s*/)
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([^:\d]+):\s*(.+)$/);
      return match
        ? { label: match[1].trim(), value: match[2].trim() }
        : { label: null, value: part.trim() };
    });
}

export function pluralDays(days: string[]) {
  const names = days.map((day) => `${day}s`);
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
