import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/theme/tokens';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconTone?: 'brand' | 'info' | 'muted';
  divider?: boolean;
  onPress?: () => void;
}

export function MetaRow({ icon, label, value, iconTone = 'brand', divider = true, onPress }: Props) {
  const color = iconTone === 'info' ? brand.blue : iconTone === 'muted' ? '#9CA3AF' : brand.green;
  const bg =
    iconTone === 'info'
      ? 'bg-python-blue/12'
      : iconTone === 'muted'
        ? 'bg-light-surface-2 dark:bg-dark-surface-2'
        : 'bg-python-green/12';

  const valueTone = onPress
    ? iconTone === 'info'
      ? 'text-python-blue-dark dark:text-python-blue-light'
      : 'text-python-green-dark dark:text-python-green-light'
    : 'text-light-text dark:text-dark-text';

  const inner = (
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
        <View className="mt-0.5 flex-row items-center gap-1">
          <Text className={`flex-1 text-base font-semibold ${valueTone}`} numberOfLines={1}>
            {value}
          </Text>
          {onPress ? (
            <Ionicons name="open-outline" size={12} color={color} style={{ marginTop: 1 }} />
          ) : null}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : {})}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}
