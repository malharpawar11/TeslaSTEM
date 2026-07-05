import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { brand } from '@/theme/tokens';

cssInterop(LinearGradient, { className: 'style' });

/** Tesla STEM brand gradient: forest green → royal blue. */
export const BRAND_COLORS = brand.gradient;
export const BRAND_COLORS_DEEP = brand.gradientDeep;
export const BRAND_COLORS_SOFT = brand.gradientSoft;

/** Three-stop hero gradient: deep forest → brand green family → deep navy.
 *  Anchored to the same #4CAF50 green used in card icons and follow buttons. */
export const BRAND_COLORS_RICH = [
  '#0C3321', // deep forest — dark foundation
  '#1D7040', // rich forest green (same family as brand.green)
  '#0B2D5C', // deep navy — professional anchor
] as const;

export { LinearGradient as Gradient };
