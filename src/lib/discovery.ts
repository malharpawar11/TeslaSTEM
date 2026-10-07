import type { Club, ClubCategory } from "../types/domain";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const CAREERS: Record<
  string,
  { categories: ClubCategory[]; keywords: string[] }
> = {
  Engineering: {
    categories: [],
    keywords: [
      "robot",
      "engineering",
      "architecture",
      "rocketry",
      "physics",
      "arduino",
    ],
  },
  "Computer science": {
    categories: [],
    keywords: [
      "coding",
      "computer",
      "programming",
      "software",
      "cyber",
      "machine learning",
      "artificial intelligence",
    ],
  },
  Medicine: {
    categories: [],
    keywords: ["health", "medicine", "biology", "hosa", "medical"],
  },
  Business: {
    categories: ["Business"],
    keywords: ["business", "finance", "entrepreneur", "deca", "fbla"],
  },
  "Arts and design": {
    categories: ["Arts"],
    keywords: ["art", "design", "music", "theater"],
  },
  Research: {
    categories: [],
    keywords: ["research", "science", "math", "olympiad"],
  },
  "Public service": {
    categories: ["Service"],
    keywords: ["service", "volunteer", "debate", "government"],
  },
};
export const MEETING_PERIODS = [
  "At Lunch",
  "After School",
  "Before School",
] as const;
export interface Availability {
  day: string;
  start: string;
  end: string;
  period?: string;
}
export interface StudentPreferences {
  interests: ClubCategory[];
  careers: string[];
  availability: Availability[];
  completed: boolean;
}
export const EMPTY_PREFERENCES: StudentPreferences = {
  interests: [],
  careers: [],
  availability: [],
  completed: false,
};

export function minutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3]?.toLowerCase();
  if (minute > 59 || hour > (period ? 12 : 23) || (period && hour < 1))
    return null;
  if (period) hour = (hour % 12) + (period === "pm" ? 12 : 0);
  return hour * 60 + minute;
}

/** No guessed lunch times or meeting duration: unknown schedules cannot match. */
export function meetingRange(time: string): [number, number] | null {
  const parts = time.split(/\s*(?:–|—|-|\bto\b)\s*/i);
  if (parts.length !== 2) return null;
  // "3-4 PM" shares the end's meridiem; explicit meridiems take precedence.
  const suffix = parts[1].match(/(am|pm)\s*$/i)?.[1];
  const start = minutes(
    parts[0] + (suffix && !/(am|pm)$/i.test(parts[0]) ? ` ${suffix}` : ""),
  );
  const end = minutes(parts[1]);
  return start !== null && end !== null && end > start ? [start, end] : null;
}

export function meetingDays(day: string): string[] {
  return DAYS.filter((name) =>
    new RegExp(`\\b${name}(?:s)?\\b|\\b${name.slice(0, 3)}\\b`, "i").test(day),
  );
}

export function fitsAvailability(
  club: Pick<Club, "day" | "time">,
  windows: Availability[],
): boolean {
  const range = meetingRange(club.time);
  return meetingDays(club.day).some((day) =>
    windows.some((window) => {
      if (window.day !== day) return false;
      if (window.period)
        return meetingPeriods(club.time).includes(window.period);
      if (!range) return false;
      const start = minutes(window.start),
        end = minutes(window.end);
      return (
        window.day === day &&
        start !== null &&
        end !== null &&
        start <= range[0] &&
        end >= range[1]
      );
    }),
  );
}

export function meetingPeriods(time: string): string[] {
  return MEETING_PERIODS.filter((period) =>
    period === "At Lunch"
      ? /\b(lunch)\b/i.test(time)
      : new RegExp(`\\b${period}\\b`, "i").test(time),
  );
}

export function careerMatches(club: Club, career: string): boolean {
  if (club.careerTags?.includes(career)) return true;
  const rule = CAREERS[career];
  if (!rule) return false;
  const text = `${club.name} ${club.description}`.toLowerCase();
  return (
    rule.categories.includes(club.category) ||
    rule.keywords.some((keyword) => text.includes(keyword))
  );
}

export function recommendationReasons(
  club: Club,
  preferences: StudentPreferences,
): string[] {
  const reasons: string[] = [];
  if (preferences.interests.includes(club.category))
    reasons.push(`${club.category} interest`);
  for (const career of preferences.careers)
    if (careerMatches(club, career)) reasons.push(career);
  if (fitsAvailability(club, preferences.availability))
    reasons.push("Fits your availability");
  return reasons;
}

export function validateMeeting(
  day: string,
  time: string,
  location: string,
): string | null {
  if (!meetingDays(day).length)
    return "Choose at least one meeting weekday (for example, Wednesday).";
  if (!meetingRange(time) && !meetingPeriods(time).length)
    return "Enter a time range (3:00 PM – 4:00 PM) or school period (At Lunch, After School, Before School).";
  if (!location.trim() || /^tbd$/i.test(location.trim()))
    return "Enter the meeting room or location.";
  return null;
}

export const CLUB_SORTS = ["Best fit", "Name A–Z", "Most members"];
export interface DiscoveryFilters {
  query: string;
  category: string;
  joinedOnly: boolean;
  availableOnly: boolean;
  career: string;
  recommendedOnly: boolean;
  day: string;
  period: string;
  openOnly: boolean;
  sort: string;
}
export function filterClubs(
  clubs: Club[],
  filters: DiscoveryFilters,
  preferences: StudentPreferences,
  isActiveMember: (id: string) => boolean,
): Club[] {
  const q = filters.query.trim().toLowerCase();
  return clubs
    .filter((club) => {
      if (filters.joinedOnly && !isActiveMember(club.id)) return false;
      if (filters.category !== "All" && club.category !== filters.category)
        return false;
      if (
        filters.availableOnly &&
        !fitsAvailability(club, preferences.availability)
      )
        return false;
      if (
        filters.career !== "All careers" &&
        !careerMatches(club, filters.career)
      )
        return false;
      if (
        filters.recommendedOnly &&
        !recommendationReasons(club, preferences).length
      )
        return false;
      if (
        filters.day !== "Any day" &&
        !meetingDays(club.day).includes(filters.day)
      )
        return false;
      if (
        filters.period !== "Any time" &&
        !meetingPeriods(club.time).includes(filters.period)
      )
        return false;
      if (filters.openOnly && club.joinPolicy !== "open") return false;
      return (
        !q ||
        [
          club.name,
          club.description,
          club.advisor,
          club.location,
          club.category,
          club.day,
          club.time,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    })
    .sort((a, b) => {
      const score =
        filters.sort === "Most members"
          ? b.memberCount - a.memberCount
          : filters.sort === "Best fit"
            ? recommendationReasons(b, preferences).length -
              recommendationReasons(a, preferences).length
            : 0;
      return score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
}
