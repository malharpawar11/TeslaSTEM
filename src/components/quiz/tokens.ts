/**
 * Type, spacing and timing for the Club Match Quiz only. Nothing outside
 * `src/components/quiz` and `app/onboarding.tsx` should import these. Colour
 * comes from the site's tokens. See "Club Match Quiz" in DESIGN.md.
 */
export const QUIZ_TYPE = {
  titleDisplay: 36,
  intro: { fontSize: 16, lineHeight: 24 },
  section: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  question: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22 },
  choice: { fontSize: 15, lineHeight: 20 },
  choiceOn: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  fieldLabel: { fontSize: 14, lineHeight: 20 },
  input: { fontSize: 16, lineHeight: 22 },
  match: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  matchTop: { fontSize: 19, lineHeight: 25, fontWeight: "700" },
  why: { fontSize: 15, lineHeight: 22 },
  button: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  meta: { fontSize: 14, lineHeight: 20 },
  metaStrong: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
} as const;

export const QUIZ_SPACE = {
  pageMax: 1150,
  gutter: 32,
  gutterPhone: 20,
  matchColumn: 420,
  columnGap: 56,
  section: 36,
  stack: 12,
  control: 8,
  controlHeight: 44,
  twoColumnFrom: 960,
  phoneBelow: 640,
} as const;

export const QUIZ_MOTION = {
  select: 140,
  list: 200,
  enter: 170,
  savedPause: 550,
};
export const QUIZ_RADIUS = 4;
export const MATCHES_PER_PAGE = 5;
