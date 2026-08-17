import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { PressableScale } from './ui/Pressable';
import { surface } from '@/theme/tokens';

interface Props {
  variant?: 'surface' | 'translucent';
}

/**
 * Light/dark switch. It swaps one icon for another — no rotation, no expanding
 * halo. A utility control shouldn't be the most animated thing on screen.
 */
export function ThemeToggle({ variant = 'surface' }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const c = surface(isDark);

  const container =
    variant === 'translucent'
      ? 'border-white/25 bg-white/10'
      : 'border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface';

  return (
    <PressableScale
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      scaleTo={0.94}
      pressedOpacity={0.7}
      className={`h-9 w-9 items-center justify-center rounded-lg border ${container}`}
    >
      <Ionicons
        name={isDark ? 'moon-outline' : 'sunny-outline'}
        size={17}
        color={variant === 'translucent' ? '#FFFFFF' : c.secondary}
      />
    </PressableScale>
  );
}
