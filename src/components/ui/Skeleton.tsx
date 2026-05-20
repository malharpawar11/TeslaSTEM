import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  className?: string;
  height?: number;
  width?: number | string;
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const RADIUS: Record<NonNullable<Props['radius']>, string> = {
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
  full: 'rounded-full',
};

export function Skeleton({ className, height, width, radius = 'md' }: Props) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        height != null ? { height } : null,
        width != null ? { width: width as never } : null,
      ]}
      className={`bg-light-surface-2 dark:bg-dark-surface-2 ${RADIUS[radius]} ${className ?? ''}`}
    />
  );
}

export function SkeletonRow({ count = 1 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="rounded-3xl border border-light-hairline bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface"
        >
          <View className="flex-row items-start gap-3">
            <Skeleton height={56} width={56} radius="xl" />
            <View className="flex-1 gap-2">
              <Skeleton height={16} width="60%" radius="sm" />
              <Skeleton height={12} width="90%" radius="sm" />
              <Skeleton height={12} width="40%" radius="sm" />
            </View>
          </View>
          <View className="mt-4 flex-row justify-between">
            <Skeleton height={14} width={120} radius="sm" />
            <Skeleton height={36} width={110} radius="full" />
          </View>
        </View>
      ))}
    </View>
  );
}
