import { ReactNode } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './Pressable';
import { brand } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'tonal' | 'outline' | 'destructive';
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

const SIZE: Record<Size, { h: string; px: string; text: string; icon: number; gap: string; radius: string }> = {
  sm: { h: 'h-9', px: 'px-3.5', text: 'text-xs', icon: 14, gap: 'gap-1.5', radius: 'rounded-xl' },
  md: { h: 'h-11', px: 'px-4', text: 'text-sm', icon: 16, gap: 'gap-2', radius: 'rounded-xl' },
  lg: { h: 'h-13', px: 'px-5', text: 'text-base', icon: 18, gap: 'gap-2', radius: 'rounded-2xl' },
  xl: { h: 'h-14', px: 'px-6', text: 'text-base', icon: 20, gap: 'gap-2.5', radius: 'rounded-2xl' },
};

const VARIANT: Record<Variant, { container: string; text: string; iconColor: string; pressedOpacity: number }> = {
  primary: {
    container: 'bg-python-green',
    text: 'text-white font-bold',
    iconColor: '#FFFFFF',
    pressedOpacity: 0.92,
  },
  secondary: {
    container:
      'bg-light-surface border border-light-border dark:bg-dark-surface-2 dark:border-dark-border',
    text: 'text-light-text dark:text-dark-text font-semibold',
    iconColor: brand.green,
    pressedOpacity: 0.85,
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-light-text dark:text-dark-text font-semibold',
    iconColor: brand.green,
    pressedOpacity: 0.6,
  },
  tonal: {
    container: 'bg-python-green/12',
    text: 'text-python-green-dark dark:text-python-green-light font-bold',
    iconColor: brand.green,
    pressedOpacity: 0.85,
  },
  outline: {
    container: 'bg-transparent border-2 border-python-green',
    text: 'text-python-green-dark dark:text-python-green-light font-bold',
    iconColor: brand.green,
    pressedOpacity: 0.7,
  },
  destructive: {
    container: 'bg-danger',
    text: 'text-white font-bold',
    iconColor: '#FFFFFF',
    pressedOpacity: 0.92,
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
      scaleTo={off ? 1 : 0.97}
      className={[
        'flex-row items-center justify-center',
        s.h,
        s.px,
        s.gap,
        s.radius,
        v.container,
        fullWidth ? 'w-full' : '',
        off ? 'opacity-50' : '',
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
