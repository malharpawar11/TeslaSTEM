import { Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '@/theme/tokens';

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type Tone = 'brand' | 'info' | 'neutral';

interface Props {
  initials?: string;
  source?: { uri: string };
  size?: Size;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  rounded?: 'square' | 'circle';
}

const SIZE: Record<Size, { box: string; text: string; icon: number }> = {
  sm: { box: 'h-8 w-8', text: 'text-xs', icon: 14 },
  md: { box: 'h-11 w-11', text: 'text-sm', icon: 18 },
  lg: { box: 'h-14 w-14', text: 'text-lg', icon: 22 },
  xl: { box: 'h-20 w-20', text: 'text-2xl', icon: 28 },
  '2xl': { box: 'h-24 w-24', text: 'text-3xl', icon: 32 },
};

const TONE_BG: Record<Tone, string> = {
  brand: 'bg-python-green',
  info: 'bg-python-blue',
  neutral: 'bg-light-surface-2 dark:bg-dark-surface-2',
};

const TONE_TEXT: Record<Tone, string> = {
  brand: 'text-white',
  info: 'text-white',
  neutral: 'text-light-secondary dark:text-dark-secondary',
};

const TONE_ICON: Record<Tone, string> = {
  brand: '#FFFFFF',
  info: '#FFFFFF',
  neutral: brand.green,
};

export function Avatar({
  initials,
  source,
  size = 'md',
  tone = 'brand',
  icon,
  rounded = 'square',
}: Props) {
  const s = SIZE[size];
  const radius = rounded === 'circle' ? 'rounded-full' : 'rounded-2xl';

  if (source) {
    return (
      <Image
        source={source}
        className={`${s.box} ${radius}`}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      className={`${s.box} ${radius} items-center justify-center ${TONE_BG[tone]}`}
    >
      {icon ? (
        <Ionicons name={icon} size={s.icon} color={TONE_ICON[tone]} />
      ) : initials ? (
        <Text className={`font-extrabold tracking-tight ${s.text} ${TONE_TEXT[tone]}`}>
          {initials}
        </Text>
      ) : null}
    </View>
  );
}
