import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { brand, palette } from '@/theme/tokens';

cssInterop(LinearGradient, { className: 'style' });

/** Tesla STEM brand gradient: deep green → deep blue. */
export const BRAND_COLORS = brand.gradient;
export const BRAND_COLORS_DEEP = brand.gradientDeep;
export const BRAND_COLORS_SOFT = brand.gradientSoft;

/**
 * Header surface for the signed-out hero. Two stops, both dark and close in
 * value, so the gradient reads as a considered surface rather than a poster.
 */
export const BRAND_COLORS_RICH = [palette.green[800], palette.blue[700]] as const;

export { LinearGradient as Gradient };
