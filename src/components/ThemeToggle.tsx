import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { PressableScale } from './ui/Pressable';
import { surface, brand } from '@/theme/tokens';
import { spring, timing } from '@/theme/motion';

interface Props {
  variant?: 'surface' | 'translucent';
}

export function ThemeToggle({ variant = 'surface' }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const c = surface(isDark);

  const progress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isDark ? 1 : 0, spring.gentle);
  }, [isDark, progress]);

  const sunStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 0.5]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 90])}deg` },
    ],
  }));

  const moonStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.5, 1]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-90, 0])}deg` },
    ],
  }));

  const tap = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: tap.value * 0.5,
    transform: [{ scale: 1 + tap.value * 0.15 }],
  }));

  const container =
    variant === 'translucent'
      ? 'border-white/25 bg-white/15'
      : 'border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface';

  return (
    <View className="relative">
      <Animated.View
        pointerEvents="none"
        style={ringStyle}
        className="absolute -inset-1 rounded-full bg-python-green/40"
      />
      <PressableScale
        onPress={() => {
          tap.value = withTiming(1, { duration: 140 }, () => {
            tap.value = withTiming(0, { duration: 220 });
          });
          toggleTheme();
        }}
        accessibilityRole="button"
        accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        scaleTo={0.92}
        className={`h-11 w-11 items-center justify-center rounded-full border ${container}`}
      >
        <View className="relative h-5 w-5 items-center justify-center">
          <Animated.View style={[sunStyle, { position: 'absolute' }]}>
            <Ionicons
              name="sunny"
              size={19}
              color={variant === 'translucent' ? '#FFFFFF' : brand.blue}
            />
          </Animated.View>
          <Animated.View style={[moonStyle, { position: 'absolute' }]}>
            <Ionicons
              name="moon"
              size={17}
              color={variant === 'translucent' ? '#FFFFFF' : brand.green}
            />
          </Animated.View>
        </View>
      </PressableScale>
    </View>
  );
}
