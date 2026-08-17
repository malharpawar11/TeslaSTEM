import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand, surfaces } from '@/theme/tokens';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  tone?: 'brand' | 'info' | 'neutral';
  hint?: string;
}

export function StatTile({ icon, value, label, tone = 'info', hint }: Props) {
  const iconColor = tone === 'brand' ? brand.green : tone === 'neutral' ? surfaces.light.subtle : brand.blue;
  const iconBg =
    tone === 'brand'
      ? 'bg-python-green/10 dark:bg-python-green/20'
      : tone === 'neutral'
        ? 'bg-light-surface-2 dark:bg-dark-surface-2'
        : 'bg-python-blue/10 dark:bg-python-blue/20';

  return (
    <View className="flex-1 rounded-xl border border-light-border bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface">
      {icon ? (
        <View className={`mb-2.5 h-8 w-8 items-center justify-center rounded-md ${iconBg}`}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
      ) : null}
      <Text className="text-2xl font-semibold tracking-tight text-light-text dark:text-dark-text">
        {value}
      </Text>
      <Text className="mt-0.5 text-xs font-medium text-light-muted dark:text-dark-muted">
        {label}
      </Text>
      {hint ? (
        <Text className="mt-1 text-2xs text-light-subtle dark:text-dark-subtle">{hint}</Text>
      ) : null}
    </View>
  );
}
