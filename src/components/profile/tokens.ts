/**
 * Type and spacing for the Profile page only. Nothing outside
 * `src/components/profile` and `app/(tabs)/account.tsx` should import these.
 */
export const PROFILE_TYPE = {
  sectionDisplay: 24,
  clubDisplay: 28,
  identity: { fontSize: 15, lineHeight: 22 },
  identityStrong: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  label: { fontSize: 15, lineHeight: 22 },
  detail: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 13, lineHeight: 18 },
  day: { fontSize: 13, lineHeight: 16 },
  dayOn: { fontSize: 13, lineHeight: 16, fontWeight: "700" },
  button: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
} as const;

export const PROFILE_SPACE = {
  pageMax: 1200,
  section: 40,
  listRow: 52,
  button: 40,
  dayCell: 28,
  dayGap: 6,
  roleColumn: 170,
  rowsFrom: 900,
  columnsFrom: 760,
  columnGap: 56,
} as const;

/** Keeps a long name on the page without letting a short one fill it. */
export function profileNameSize(name: string, width: number) {
  const fit = width / Math.max(name.length * 0.41, 4);
  return Math.round(Math.max(44, Math.min(96, fit)));
}
