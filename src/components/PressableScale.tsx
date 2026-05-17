import { ReactNode } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  children: ReactNode;
  className?: string;
  scaleTo?: number;
}

export function PressableScale({ children, className, scaleTo = 0.96, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      className={className}
      style={animatedStyle}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 120 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 160 });
        rest.onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
