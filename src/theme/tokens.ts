/**
 * Runtime color tokens. Tailwind covers className styling; this file is the
 * single source of truth for places Tailwind can't reach (icon `color={...}`,
 * Gradient color stops, status bar tints, native shadow color, etc).
 */

export const palette = {
  green: {
    50: '#ECF8ED',
    100: '#D6F0D8',
    200: '#AFE0B3',
    300: '#88D08D',
    400: '#67C26C',
    500: '#4CAF50',
    600: '#3D9140',
    700: '#2E7332',
    800: '#1F5523',
    900: '#103714',
  },
  blue: {
    50: '#E5EFFA',
    100: '#C8DDF4',
    200: '#92BCE9',
    300: '#5C9ADE',
    400: '#3580D3',
    500: '#1565C0',
    600: '#0F4C92',
    700: '#0B396E',
    800: '#072649',
    900: '#031325',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const brand = {
  green: palette.green[500],
  greenDeep: palette.green[700],
  greenSoft: palette.green[100],
  blue: palette.blue[500],
  blueDeep: palette.blue[700],
  blueSoft: palette.blue[100],
  gradient: [palette.green[500], palette.blue[500]] as const,
  gradientDeep: [palette.green[600], palette.blue[700]] as const,
  gradientSoft: [palette.green[300], palette.blue[300]] as const,
} as const;

export const semantic = {
  success: brand.green,
  info: brand.blue,
  warn: '#F59E0B',
  danger: '#E11D48',
} as const;

const lightSurface = {
  bg: '#FAFBFC',
  surface: '#FFFFFF',
  surface2: '#F4F5F7',
  surface3: '#EDEFF2',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  hairline: '#EEF0F3',
  text: '#0B0D10',
  secondary: '#111318',
  muted: '#6B7280',
  subtle: '#9CA3AF',
} as const;

const darkSurface = {
  bg: '#08090B',
  surface: '#0F1115',
  surface2: '#15171C',
  surface3: '#0B0D11',
  border: '#1E2128',
  borderStrong: '#2A2E36',
  hairline: '#15171C',
  text: '#F4F6F8',
  secondary: '#C6CAD2',
  muted: '#8A8F99',
  subtle: '#5B6068',
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
