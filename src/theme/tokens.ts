/**
 * Runtime color tokens. Tailwind covers className styling; this file is the
 * single source of truth for places Tailwind can't reach (icon `color={...}`,
 * Gradient color stops, status bar tints, native shadow color, etc).
 *
 * Brand rule: BLUE is the primary. It carries navigation, primary actions,
 * links, focus and selection. GREEN is the accent — reserved for confirmation
 * and membership ("joined", "approved", "success"). Keeping green scarce is
 * what makes it mean something, and what keeps the app from looking like a
 * highlighter.
 */

export const palette = {
  blue: {
    50: '#EDF3FA',
    100: '#D3E3F4',
    200: '#A6C6E8',
    300: '#6BA1D8',
    400: '#2E79C4',
    500: '#0E5AA8',
    600: '#0C4A8B',
    700: '#0A3B6F',
    800: '#082D55',
    900: '#06203C',
  },
  green: {
    50: '#EDF7F2',
    100: '#D3EDE1',
    200: '#A5D9C3',
    300: '#6BBF9D',
    400: '#2E9E76',
    500: '#12805A',
    600: '#0D6141',
    700: '#0A4A32',
    800: '#073423',
    900: '#052117',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const brand = {
  /** Primary — navigation, primary buttons, links, focus. */
  blue: palette.blue[500],
  blueDeep: palette.blue[700],
  blueSoft: palette.blue[100],
  /** Accent — confirmation, membership, success. Use sparingly. */
  green: palette.green[500],
  greenDeep: palette.green[700],
  greenSoft: palette.green[100],
  /** Two-stop brand gradient, deep green → deep blue. Header surfaces only. */
  gradient: [palette.green[700], palette.blue[600]] as const,
  gradientDeep: [palette.green[800], palette.blue[800]] as const,
  gradientSoft: [palette.green[100], palette.blue[100]] as const,
} as const;

export const semantic = {
  success: brand.green,
  info: brand.blue,
  warn: '#B45309',
  danger: '#B42318',
} as const;

const lightSurface = {
  bg: '#F6F8FA',
  surface: '#FFFFFF',
  surface2: '#EEF2F6',
  surface3: '#E4EAF0',
  border: '#DDE3EA',
  borderStrong: '#C3CEDA',
  hairline: '#E8EDF2',
  text: '#0E1A26',
  secondary: '#33465A',
  muted: '#63758A',
  subtle: '#91A0B0',
} as const;

const darkSurface = {
  bg: '#0B1017',
  surface: '#111823',
  surface2: '#172230',
  surface3: '#0E141D',
  border: '#22303F',
  borderStrong: '#324357',
  hairline: '#1A2531',
  text: '#E9EFF5',
  secondary: '#B6C4D2',
  muted: '#8397A9',
  subtle: '#5E7183',
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
