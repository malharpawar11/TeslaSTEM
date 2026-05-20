import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/theme/tokens';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconTone?: 'brand' | 'info' | 'muted';
  divider?: boolean;
}

export function MetaRow({ icon, label, value, iconTone = 'brand', divider = true }: Props) {
  const color = iconTone === 'info' ? brand.blue : iconTone === 'muted' ? '#9CA3AF' : brand.green;
  const bg =
    iconTone === 'info'
      ? 'bg-python-blue/12'
      : iconTone === 'muted'
        ? 'bg-light-surface-2 dark:bg-dark-surface-2'
        : 'bg-python-green/12';

  return (
    <View
      className={`flex-row items-center gap-3.5 py-3.5 ${
        divider ? 'border-b border-light-hairline dark:border-dark-border' : ''
      }`}
    >
      <View className={`h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-2xs font-semibold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          {label}
        </Text>
        <Text className="mt-0.5 text-base font-semibold text-light-text dark:text-dark-text">
          {value}
        </Text>
      </View>
    </View>
  );
}
