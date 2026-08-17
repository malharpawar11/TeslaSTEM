import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand, surfaces } from '@/theme/tokens';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconTone?: 'brand' | 'info' | 'muted';
  divider?: boolean;
  onPress?: () => void;
}

/**
 * Label/value row for club details. The icon sits in the gutter without a
 * coloured tile — a wall of tinted squares reads as decoration, not structure.
 */
export function MetaRow({ icon, label, value, iconTone = 'info', divider = true, onPress }: Props) {
  const color =
    iconTone === 'brand' ? brand.green : iconTone === 'muted' ? surfaces.light.subtle : brand.blue;

  const valueTone = onPress
    ? 'text-python-blue-dark dark:text-python-blue-light'
    : 'text-light-text dark:text-dark-text';

  const inner = (
    <View
      className={`flex-row items-center gap-3 py-3 ${
        divider ? 'border-b border-light-hairline dark:border-dark-border' : ''
      }`}
    >
      <View className="w-5 items-center">
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-light-muted dark:text-dark-muted">{label}</Text>
        <View className="mt-0.5 flex-row items-center gap-1">
          <Text className={`flex-1 text-base font-medium ${valueTone}`} numberOfLines={1}>
            {value}
          </Text>
          {onPress ? <Ionicons name="open-outline" size={13} color={color} /> : null}
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
