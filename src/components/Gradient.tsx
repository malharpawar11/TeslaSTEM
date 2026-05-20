import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { brand } from '@/theme/tokens';

cssInterop(LinearGradient, { className: 'style' });

/** Tesla STEM brand gradient: forest green → royal blue. */
export const BRAND_COLORS = brand.gradient;
export const BRAND_COLORS_DEEP = brand.gradientDeep;
export const BRAND_COLORS_SOFT = brand.gradientSoft;

/** Three-stop premium gradient with a subtle inflection — feels less linear. */
export const BRAND_COLORS_RICH = [
  brand.green,
  '#2C8DA0', // teal midpoint where green→blue meet
  brand.blue,
] as const;

export { LinearGradient as Gradient };
