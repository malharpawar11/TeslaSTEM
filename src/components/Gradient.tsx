import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

cssInterop(LinearGradient, { className: 'style' });

/** Tesla STEM brand gradient: forest green → royal blue. */
export const BRAND_COLORS = ['#4CAF50', '#1565C0'] as const;

export { LinearGradient as Gradient };
