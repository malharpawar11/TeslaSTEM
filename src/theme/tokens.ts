/**
 * Runtime color tokens. Tailwind covers className styling; this file is the
 * source of truth for places Tailwind can't reach (icon `color={...}`, WebGL
 * materials, status bar tints).
 *
 * Black and white sheets with two accents from the Pythons crest: royal blue
 * and laurel green.
 */

export const palette = {
  blue: {
    50: '#EDF2FE',
    100: '#DAE5FD',
    200: '#B6CBFB',
    300: '#8AAEFF',
    400: '#5C8AF6',
    500: '#3068F0',
    600: '#2556CC',
    700: '#1C44A6',
    800: '#14307A',
    900: '#0D2052',
  },
  green: {
    50: '#EFF9EA',
    100: '#DBF1CF',
    200: '#B8E3A0',
    300: '#7FD955',
    400: '#5CB82E',
    500: '#3A8F1E',
    600: '#2F7518',
    700: '#255C13',
    800: '#1A420D',
    900: '#102A08',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Backgrounds are plain black or white. Colour is only ever an accent: blue
 * for actions and selection, green for membership and anything "on".
 */
export const ink = {
  deep: '#000000',
  night: '#000000',
  blue: palette.blue[500],
  laurel: palette.green[400],
} as const;

export const brand = {
  /** Icons and links. A mid-tone that holds 3:1 on both paper and night. */
  blue: palette.blue[500],
  blueDeep: palette.blue[700],
  blueSoft: palette.blue[100],
  /** Confirmation and membership. */
  green: palette.green[500],
  greenDeep: palette.green[700],
  greenSoft: palette.green[100],
  gradient: [palette.blue[500], palette.blue[500]] as const,
  gradientDeep: [palette.blue[700], palette.blue[700]] as const,
  gradientSoft: [palette.blue[100], palette.blue[100]] as const,
} as const;

export const semantic = {
  success: brand.green,
  info: brand.blue,
  warn: '#A86A00',
  danger: '#D6402F',
} as const;

const lightSurface = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F2F2F2',
  surface3: '#E8E8E8',
  border: '#E0E0E0',
  borderStrong: '#BDBDBD',
  hairline: '#EEEEEE',
  text: '#000000',
  secondary: '#333333',
  muted: '#666666',
  subtle: '#767676',
} as const;

const darkSurface = {
  bg: '#000000',
  surface: '#111111',
  surface2: '#1C1C1C',
  surface3: '#0A0A0A',
  border: '#2A2A2A',
  borderStrong: '#4A4A4A',
  hairline: '#1E1E1E',
  text: '#FFFFFF',
  secondary: '#D4D4D4',
  muted: '#A3A3A3',
  subtle: '#8A8A8A',
} as const;

export const surfaces = {
  light: lightSurface,
  dark: darkSurface,
} as const;

export function themed<T>(isDark: boolean, light: T, dark: T): T {
  return isDark ? dark : light;
}

export function surface(isDark: boolean) {
  return isDark ? darkSurface : lightSurface;
}
