import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand, surfaces } from '@/theme/tokens';
import { Button } from './Button';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'brand' | 'info' | 'neutral';
}

export function EmptyState({
  icon = 'search',
  title,
  description,
  actionLabel,
  onAction,
  tone = 'info',
}: Props) {
  const iconColor =
    tone === 'brand' ? brand.green : tone === 'neutral' ? surfaces.light.subtle : brand.blue;
  const iconBg =
    tone === 'brand'
      ? 'bg-python-green/10 dark:bg-python-green/20'
      : tone === 'neutral'
        ? 'bg-light-surface-2 dark:bg-dark-surface-2'
        : 'bg-python-blue/10 dark:bg-python-blue/20';

  return (
    <View className="items-center px-8 py-14">
      <View className={`h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text className="mt-4 text-center text-base font-semibold text-light-text dark:text-dark-text">
        {title}
      </Text>
      {description ? (
        <Text className="mt-1.5 max-w-xs text-center text-sm leading-5 text-light-muted dark:text-dark-muted">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-4">
          <Button label={actionLabel} onPress={onAction} variant="secondary" size="md" />
        </View>
      ) : null}
    </View>
  );
}
