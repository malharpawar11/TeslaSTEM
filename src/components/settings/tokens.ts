/**
 * Type and spacing for the Settings page only. Nothing outside
 * `src/components/settings` and `app/settings.tsx` should import these.
 */
export const SETTINGS_TYPE = {
  titleDisplay: 32,
  intro: { fontSize: 15, lineHeight: 22 },
  section: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
  name: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
  label: { fontSize: 15, lineHeight: 22 },
  description: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 13, lineHeight: 18 },
  button: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  segment: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  preview: { fontSize: 17, lineHeight: 28 },
} as const;

export const SETTINGS_SPACE = {
  pageMax: 900,
  sectionColumn: 208,
  columnGap: 40,
  twoColumnFrom: 720,
  sectionPad: 28,
  rowPad: 14,
  control: 40,
  controlTouch: 44,
} as const;

export const SETTINGS_RADIUS = 4;
export const SETTINGS_MOTION_MS = 150;
