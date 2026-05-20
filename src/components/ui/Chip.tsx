import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './Pressable';
import { brand } from '@/theme/tokens';

type Variant = 'filter' | 'toggle' | 'static';
type Tone = 'neutral' | 'brand' | 'info';

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
  variant?: Variant;
  tone?: Tone;
  size?: 'sm' | 'md';
}

export function Chip({
  label,
  active = false,
  onPress,
  icon,
  count,
  variant = 'filter',
  tone = 'brand',
  size = 'md',
}: Props) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const text = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = count != null ? 'pl-3.5 pr-2' : 'px-3.5';
  const iconSize = size === 'sm' ? 13 : 15;

  const palette = tone === 'info' ? brand.blue : brand.green;

  const activeContainer =
    tone === 'info'
      ? 'border-python-blue bg-python-blue'
      : 'border-python-green bg-python-green';
  const inactiveContainer =
    'border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface';

  const inactiveText = 'text-light-secondary dark:text-dark-secondary';
  const activeText = 'text-white';

  const content = (
    <>
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSize}
          color={active ? '#FFFFFF' : palette}
        />
      ) : null}
      <Text
        className={`${text} font-semibold ${active ? activeText : inactiveText}`}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count != null ? (
        <View
          className={`min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 ${
            active ? 'bg-white/25' : 'bg-light-surface-2 dark:bg-dark-surface-2'
          }`}
        >
          <Text
            className={`text-[10px] font-bold ${
              active ? 'text-white' : 'text-light-muted dark:text-dark-muted'
            }`}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </>
  );

  if (variant === 'static' || !onPress) {
    return (
      <View
        className={`${h} ${padding} flex-row items-center justify-center gap-1.5 rounded-full border ${
          active ? activeContainer : inactiveContainer
        }`}
      >
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      pressedOpacity={0.8}
      scaleTo={0.96}
      className={`${h} ${padding} flex-row items-center justify-center gap-1.5 rounded-full border ${
        active ? activeContainer : inactiveContainer
      }`}
    >
      {content}
    </PressableScale>
  );
}
