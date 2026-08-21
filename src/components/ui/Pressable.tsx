import { ReactNode, forwardRef } from 'react';
import { Pressable, PressableProps, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { spring, timing } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  children: ReactNode;
  className?: string;
  /** Press scale target (default 0.97). Set to 1 to disable. */
  scaleTo?: number;
  /** Opacity on press (default 1). */
  pressedOpacity?: number;
  /** When true, no accessibilityRole defaults; useful for tappable cards that wrap other interactive elements (avoids nested <button> on web). */
  asSurface?: boolean;
}

/**
 * Polished interactive surface: spring-scaled press, optional press-opacity,
 * and `asSurface` to render as a non-button so it can wrap other buttons on web.
 */
export const PressableScale = forwardRef<View, Props>(function PressableScale(
  { children, className, scaleTo = 0.97, pressedOpacity = 1, asSurface, ...rest },
  ref,
) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      ref={ref as never}
      {...rest}
      accessibilityRole={asSurface ? undefined : rest.accessibilityRole}
      className={className}
      style={[animatedStyle, rest.style as never]}
      onPressIn={(e) => {
        if (scaleTo !== 1) scale.value = withSpring(scaleTo, spring.press);
        if (pressedOpacity !== 1) opacity.value = withTiming(pressedOpacity, timing.snap);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (scaleTo !== 1) scale.value = withSpring(1, spring.press);
        if (pressedOpacity !== 1) opacity.value = withTiming(1, timing.snap);
        rest.onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
});
