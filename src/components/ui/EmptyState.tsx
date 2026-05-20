import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/theme/tokens';
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
  tone = 'brand',
}: Props) {
  const ringColor = tone === 'info' ? brand.blue : brand.green;
  const ringBg =
    tone === 'info' ? 'bg-python-blue/12' : tone === 'neutral' ? 'bg-light-surface-2 dark:bg-dark-surface-2' : 'bg-python-green/12';

  return (
    <View className="items-center px-8 py-16">
      <View
        className={`h-20 w-20 items-center justify-center rounded-3xl ${ringBg}`}
      >
        <Ionicons name={icon} size={32} color={tone === 'neutral' ? '#9CA3AF' : ringColor} />
      </View>
      <Text className="mt-5 text-center text-lg font-bold tracking-tight text-light-text dark:text-dark-text">
        {title}
      </Text>
      {description ? (
        <Text className="mt-1.5 max-w-xs text-center text-sm text-light-muted dark:text-dark-muted">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-5">
          <Button label={actionLabel} onPress={onAction} variant="tonal" size="md" />
        </View>
      ) : null}
    </View>
  );
}
