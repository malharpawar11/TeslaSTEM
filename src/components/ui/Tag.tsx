import { Text, View } from 'react-native';
import { ClubCategory } from '@/types/domain';

interface Props {
  label: string;
  tone?: 'brand' | 'info' | 'success' | 'warn' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  filled?: boolean;
}

const TONE_FILLED: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-python-green',
  info: 'bg-python-blue',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  neutral: 'bg-light-surface-2 dark:bg-dark-surface-2',
};

const TONE_SOFT: Record<NonNullable<Props['tone']>, { bg: string; text: string }> = {
  brand: { bg: 'bg-python-green/12', text: 'text-python-green-dark dark:text-python-green-light' },
  info: { bg: 'bg-python-blue/12', text: 'text-python-blue-dark dark:text-python-blue-light' },
  success: { bg: 'bg-success/14', text: 'text-success' },
  warn: { bg: 'bg-warn/14', text: 'text-warn' },
  danger: { bg: 'bg-danger/14', text: 'text-danger' },
  neutral: { bg: 'bg-light-surface-2 dark:bg-dark-surface-2', text: 'text-light-secondary dark:text-dark-secondary' },
};

export function Tag({ label, tone = 'brand', size = 'sm', filled = false }: Props) {
  const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5';
  const text = size === 'sm' ? 'text-2xs' : 'text-xs';

  if (filled) {
    return (
      <View className={`${padding} rounded-full ${TONE_FILLED[tone]}`}>
        <Text className={`${text} font-bold uppercase tracking-wider text-white`} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  const soft = TONE_SOFT[tone];
  return (
    <View className={`${padding} rounded-full ${soft.bg}`}>
      <Text
        className={`${text} font-bold uppercase tracking-wider ${soft.text}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Disciplined category→tone mapping. The brand is strict green/blue, so categories
 * alternate between brand colors. This keeps cards visually unified.
 */
export function categoryTone(c: ClubCategory): 'brand' | 'info' {
  switch (c) {
    case 'STEM':
    case 'Service':
    case 'Wellness':
    case 'Sports':
      return 'brand';
    case 'Academic':
    case 'Business':
    case 'Arts':
    case 'Culture':
    default:
      return 'info';
  }
}
