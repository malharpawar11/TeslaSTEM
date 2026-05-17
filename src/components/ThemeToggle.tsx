import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { PressableScale } from './PressableScale';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <PressableScale
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="h-11 w-11 items-center justify-center rounded-full border border-light-border bg-light-card dark:border-dark-border dark:bg-dark-card"
    >
      <Animated.View key={isDark ? 'moon' : 'sun'} entering={FadeIn.duration(220)}>
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={20}
          color={isDark ? '#6FBF73' : '#1565C0'}
        />
      </Animated.View>
    </PressableScale>
  );
}
