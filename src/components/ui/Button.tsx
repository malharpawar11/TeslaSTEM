import { ReactNode } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './Pressable';
import { brand } from '@/theme/tokens';

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'tonal'
  | 'outline'
  | 'success'
  | 'destructive';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  className?: string;
  /** Render children instead of label (e.g. for richer content). */
  children?: ReactNode;
}

// `h-13` is not a Tailwind default, so heights are set explicitly here rather
// than through the scale — a missing height class silently collapses a button.
const SIZE: Record<Size, { h: number; px: string; text: string; icon: number; gap: string; radius: string }> = {
  sm: { h: 32, px: 'px-3', text: 'text-xs', icon: 14, gap: 'gap-1.5', radius: 'rounded-lg' },
  md: { h: 40, px: 'px-4', text: 'text-sm', icon: 16, gap: 'gap-2', radius: 'rounded-lg' },
  lg: { h: 48, px: 'px-5', text: 'text-base', icon: 18, gap: 'gap-2', radius: 'rounded-xl' },
  xl: { h: 54, px: 'px-6', text: 'text-base', icon: 19, gap: 'gap-2', radius: 'rounded-xl' },
};

const VARIANT: Record<Variant, { container: string; text: string; iconColor: string; pressedOpacity: number }> = {
  // Blue carries every primary action in the app.
  primary: {
    container: 'bg-python-blue',
    text: 'text-white font-semibold',
    iconColor: '#FFFFFF',
    pressedOpacity: 0.9,
  },
  secondary: {
    container:
      'bg-light-surface border border-light-border dark:bg-dark-surface-2 dark:border-dark-border',
    text: 'text-light-text dark:text-dark-text font-semibold',
    iconColor: brand.blue,
    pressedOpacity: 0.8,
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-python-blue-dark dark:text-python-blue-light font-semibold',
    iconColor: brand.blue,
    pressedOpacity: 0.6,
  },
  tonal: {
    container: 'bg-python-blue/10 dark:bg-python-blue/20',
    text: 'text-python-blue-dark dark:text-python-blue-light font-semibold',
    iconColor: brand.blue,
    pressedOpacity: 0.8,
  },
  outline: {
    container: 'bg-transparent border border-python-blue/45',
    text: 'text-python-blue-dark dark:text-python-blue-light font-semibold',
    iconColor: brand.blue,
    pressedOpacity: 0.7,
  },
  // Green is the confirmation accent — joining, approving, publishing.
  success: {
    container: 'bg-python-green',
    text: 'text-white font-semibold',
    iconColor: '#FFFFFF',
    pressedOpacity: 0.9,
  },
  destructive: {
    container: 'bg-danger',
    text: 'text-white font-semibold',
    iconColor: '#FFFFFF',
    pressedOpacity: 0.9,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  accessibilityLabel,
  className,
  children,
}: Props) {
  const s = SIZE[size];
  const v = VARIANT[variant];
  const off = disabled || loading;

  return (
    <PressableScale
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      pressedOpacity={off ? 1 : v.pressedOpacity}
      scaleTo={off ? 1 : 0.985}
      style={{ height: s.h }}
      className={[
        'flex-row items-center justify-center',
        s.px,
        s.gap,
        s.radius,
        v.container,
        fullWidth ? 'w-full' : '',
        off ? 'opacity-45' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.iconColor} />
      ) : icon ? (
        <Ionicons name={icon} size={s.icon} color={v.iconColor} />
      ) : null}
      {children ?? (
        <Text className={`${s.text} ${v.text}`} numberOfLines={1}>
          {label}
        </Text>
      )}
      {!loading && iconRight ? (
        <Ionicons name={iconRight} size={s.icon} color={v.iconColor} />
      ) : null}
    </PressableScale>
  );
}
