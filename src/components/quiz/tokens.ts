/**
 * Type, spacing and timing for the Club Match Quiz only. Nothing outside
 * `src/components/quiz` and `app/onboarding.tsx` should import these. Colour
 * comes from the site's tokens. See "Club Match Quiz" in DESIGN.md.
 */
export const QUIZ_TYPE = {
  question: 44,
  questionPhone: 32,
  results: 52,
  resultsPhone: 38,
  cardTitle: 24,
  cardTitleSmall: 20,
  matchName: 30,
  cardLabel: { fontSize: 14, lineHeight: 19 },
  helper: { fontSize: 16, lineHeight: 23 },
  body: { fontSize: 15, lineHeight: 22 },
  reason: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 14, lineHeight: 20 },
  metaStrong: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  section: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  button: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
} as const;

export const QUIZ_SPACE = {
  questionMax: 980,
  resultsMax: 1100,
  gutter: 32,
  gutterPhone: 20,
  cardGap: 10,
  cardMinHeight: 92,
  smallCardMinHeight: 64,
  controlHeight: 48,
  phoneBelow: 640,
} as const;

export const QUIZ_MOTION = {
  /** A question slides in from the side it's coming from. */
  step: 220,
  select: 140,
};

export const QUIZ_RADIUS = 4;
