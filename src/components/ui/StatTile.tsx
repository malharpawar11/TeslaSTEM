import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/theme/tokens';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  tone?: 'brand' | 'info' | 'neutral';
  hint?: string;
}

export function StatTile({ icon, value, label, tone = 'brand', hint }: Props) {
  const iconColor = tone === 'info' ? brand.blue : tone === 'neutral' ? '#9CA3AF' : brand.green;
  const iconBg =
    tone === 'info'
      ? 'bg-python-blue/12'
      : tone === 'neutral'
        ? 'bg-light-surface-2 dark:bg-dark-surface-2'
        : 'bg-python-green/12';

  return (
    <View className="flex-1 rounded-2xl border border-light-hairline bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface">
      {icon ? (
        <View className={`mb-3 h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <Text className="text-3xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
        {value}
      </Text>
      <Text className="mt-0.5 text-xs font-semibold text-light-muted dark:text-dark-muted">
        {label}
      </Text>
      {hint ? (
        <Text className="mt-1 text-2xs text-light-subtle dark:text-dark-subtle">{hint}</Text>
      ) : null}
    </View>
  );
}
