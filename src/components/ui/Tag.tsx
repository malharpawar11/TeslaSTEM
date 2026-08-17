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
  brand: { bg: 'bg-python-green/10 dark:bg-python-green/20', text: 'text-python-green-dark dark:text-python-green-light' },
  info: { bg: 'bg-python-blue/10 dark:bg-python-blue/20', text: 'text-python-blue-dark dark:text-python-blue-light' },
  success: { bg: 'bg-success/10 dark:bg-success/20', text: 'text-success dark:text-python-green-light' },
  warn: { bg: 'bg-warn/10 dark:bg-warn/20', text: 'text-warn' },
  danger: { bg: 'bg-danger/10 dark:bg-danger/20', text: 'text-danger' },
  neutral: { bg: 'bg-light-surface-2 dark:bg-dark-surface-2', text: 'text-light-muted dark:text-dark-muted' },
};

/**
 * Small status/category label. Sentence case on purpose — all-caps micro type
 * is hard to read at 11px and makes every label shout equally loudly.
 */
export function Tag({ label, tone = 'info', size = 'sm', filled = false }: Props) {
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const text = size === 'sm' ? 'text-2xs' : 'text-xs';

  if (filled) {
    return (
      <View className={`${padding} rounded-md ${TONE_FILLED[tone]}`}>
        <Text className={`${text} font-semibold text-white`} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  const soft = TONE_SOFT[tone];
  return (
    <View className={`${padding} rounded-md ${soft.bg}`}>
      <Text className={`${text} font-semibold ${soft.text}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Categories are informational, not statuses, so they all take the blue
 * informational tone. Green stays reserved for membership and approval, which
 * is what makes a green pill on a card actually mean something.
 */
export function categoryTone(_c: ClubCategory): 'brand' | 'info' {
  return 'info';
}

/**
 * Deterministic accent for a club's avatar, so the directory has some rhythm
 * without colour being random. Split is by category, not by hash.
 */
export function categoryAccent(c: ClubCategory): 'brand' | 'info' {
  switch (c) {
    case 'STEM':
    case 'Service':
    case 'Wellness':
    case 'Sports':
      return 'brand';
    default:
      return 'info';
  }
}
