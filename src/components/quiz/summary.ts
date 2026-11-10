import { minutes, type Availability } from "@/lib/discovery";
import {
  ACTIVITIES,
  ALL_TOPICS,
  CHALLENGES,
  EXPERIENCE,
  FOLLOW_UPS,
  OUTCOMES,
  STYLES,
  WEEKDAYS,
  type QuizAnswers,
} from "@/lib/clubMatch";
import type { Step } from "./steps";

export function list(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function clock(value: string) {
  const total = minutes(value);
  if (total === null) return value;
  const hour = Math.floor(total / 60);
  return `${hour % 12 || 12}:${String(total % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

/** "Monday after school", or "Monday 3:00 PM–4:00 PM" for an older saved range. */
export function windowLabel(w: Availability) {
  if (w.period) return `${w.day} ${w.period.toLowerCase()}`;
  return `${w.day} ${clock(w.start)}–${clock(w.end)}`;
}

const titleOf = (options: { id: string; title: string }[], id: string | null) =>
  options.find((o) => o.id === id)?.title ?? null;
const phraseOf = (options: { id: string; phrase: string }[], ids: string[]) =>
  ids.map((id) => options.find((o) => o.id === id)?.phrase).filter((p): p is string => !!p);

/** One sentence that plays back what the student told us. */
export function profileSentence(answers: QuizAnswers, availability: Availability[]) {
  const parts: string[] = [];
  const likes = phraseOf(ACTIVITIES, answers.activities).slice(0, 3);
  if (likes.length) parts.push(`you enjoy ${list(likes)}`);
  const topics = phraseOf(ALL_TOPICS, answers.topics).slice(0, 3);
  if (topics.length) parts.push(`want to explore ${list(topics)}`);
  const wants = phraseOf(OUTCOMES, answers.outcomes).slice(0, 2);
  if (wants.length) parts.push(`are after ${list(wants)}`);
  const days = WEEKDAYS.filter((d) => availability.some((w) => w.day === d));
  if (days.length) parts.push(`can meet on ${days.length === 5 ? "any weekday" : list(days)}`);
  if (!parts.length) return null;
  const joined =
    parts.length < 2 ? parts[0] : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  return `You told us ${joined}.`;
}

/** Each answered question as a short line, for the "Your answers" list. */
export function answerLine(step: Step, answers: QuizAnswers, availability: Availability[]) {
  switch (step.key) {
    case "activities":
      return list(answers.activities.map((id) => titleOf(ACTIVITIES, id)!).filter(Boolean));
    case "challenge":
      return titleOf(CHALLENGES, answers.challenge) ?? "";
    case "style":
      return titleOf(STYLES, answers.style) ?? "";
    case "outcomes":
      return list(answers.outcomes.map((id) => titleOf(OUTCOMES, id)!).filter(Boolean));
    case "topics":
      return list(answers.topics.map((id) => titleOf(ALL_TOPICS, id)!).filter(Boolean));
    case "experience":
      return titleOf(EXPERIENCE, answers.experience) ?? "";
    case "availability":
      return availability.length
        ? `${availability.length} ${availability.length === 1 ? "time" : "times"} a week`
        : "";
    default: {
      const id = step.key.slice("follow:".length);
      const f = FOLLOW_UPS.find((x) => x.id === id);
      return list((answers.followUps[id] ?? []).map((o) => titleOf(f?.options ?? [], o)!).filter(Boolean));
    }
  }
}
