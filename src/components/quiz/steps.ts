import {
  ACTIVITIES,
  CHALLENGES,
  EXPERIENCE,
  OUTCOMES,
  STYLES,
  availableTopics,
  followUpsFor,
  type FollowUp,
  type Option,
  type QuizAnswers,
} from "@/lib/clubMatch";
import type { Club } from "@/types/domain";

export type Step =
  | { key: "activities"; title: string; helper: string; multi: true; options: Option[]; size: "large" }
  | { key: "challenge" | "style" | "experience"; title: string; helper: string; multi: false; options: Option[]; size: "large" }
  | { key: "outcomes"; title: string; helper: string; multi: true; options: Option[]; size: "large" }
  | { key: "topics"; title: string; helper: string; multi: true; options: Option[]; size: "small" }
  | { key: `follow:${string}`; title: string; helper: string; multi: true; options: Option[]; size: "large"; followUp: FollowUp }
  | { key: "availability"; title: string; helper: string };

/**
 * The questions this student sees, in order. Follow-ups come right after the
 * topics question and only when earlier answers make them worth asking.
 */
export function buildSteps(answers: QuizAnswers, clubs: Club[]): Step[] {
  const followUps = followUpsFor(answers, clubs);
  return [
    { key: "activities", title: "What would you actually enjoy doing?", helper: "Pick everything that sounds fun. Think about what you'd do, not what you're good at.", multi: true, options: ACTIVITIES, size: "large" },
    { key: "challenge", title: "What kind of challenge sounds most exciting?", helper: "Pick the one that sounds best.", multi: false, options: CHALLENGES, size: "large" },
    { key: "style", title: "How do you prefer working?", helper: "Pick one.", multi: false, options: STYLES, size: "large" },
    { key: "outcomes", title: "What would you like to get out of a club?", helper: "Pick as many as you like.", multi: true, options: OUTCOMES, size: "large" },
    { key: "topics", title: "What would you genuinely like to explore?", helper: "Every topic here has at least one club behind it.", multi: true, options: availableTopics(clubs), size: "small" },
    ...followUps.map(
      (f): Step => ({
        key: `follow:${f.id}`,
        title: f.question,
        helper: "Because of what you picked. Choose any that fit.",
        multi: true,
        options: f.options,
        size: "large",
        followUp: f,
      }),
    ),
    { key: "experience", title: "How much experience do you have?", helper: "Beginners are never ranked lower. This only helps find clubs that welcome newcomers.", multi: false, options: EXPERIENCE, size: "large" },
    { key: "availability", title: "When are you actually free?", helper: "Tap every time you could make a meeting. Clubs at these times rank higher." },
  ];
}

export function selectedFor(step: Step, answers: QuizAnswers): string[] {
  switch (step.key) {
    case "activities":
      return answers.activities;
    case "outcomes":
      return answers.outcomes;
    case "topics":
      return answers.topics;
    case "challenge":
      return answers.challenge ? [answers.challenge] : [];
    case "style":
      return answers.style ? [answers.style] : [];
    case "experience":
      return answers.experience ? [answers.experience] : [];
    case "availability":
      return [];
    default:
      return answers.followUps[step.key.slice("follow:".length)] ?? [];
  }
}

export function withSelection(step: Step, answers: QuizAnswers, ids: string[]): QuizAnswers {
  switch (step.key) {
    case "activities":
      return { ...answers, activities: ids };
    case "outcomes":
      return { ...answers, outcomes: ids };
    case "topics":
      return { ...answers, topics: ids };
    case "challenge":
      return { ...answers, challenge: ids[0] ?? null };
    case "style":
      return { ...answers, style: ids[0] ?? null };
    case "experience":
      return { ...answers, experience: ids[0] ?? null };
    case "availability":
      return answers;
    default:
      return { ...answers, followUps: { ...answers.followUps, [step.key.slice("follow:".length)]: ids } };
  }
}

/** Drops answers to follow-ups the student no longer sees. */
export function pruneAnswers(answers: QuizAnswers, steps: Step[]): QuizAnswers {
  const live = new Set(steps.map((s) => s.key));
  const followUps: Record<string, string[]> = {};
  for (const [id, chosen] of Object.entries(answers.followUps))
    if (live.has(`follow:${id}`) && chosen.length) followUps[id] = chosen;
  return { ...answers, followUps };
}
