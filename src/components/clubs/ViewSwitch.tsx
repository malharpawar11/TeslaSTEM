import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { easing } from "@/theme/motion";

export function ViewSwitch<T extends string>({
  options,
  value,
  onChange,
  width: WIDTH = 70,
  label = "Layout",
  onBlue = false,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  width?: number;
  label?: string;
  onBlue?: boolean;
}) {
  const reduced = useReducedMotion();
  const index = options.indexOf(value);
  const x = useSharedValue(index * WIDTH);
  useEffect(() => {
    x.value = reduced
      ? index * WIDTH
      : withTiming(index * WIDTH, { duration: 200, easing: easing.emphasized });
  }, [index, reduced, x, WIDTH]);
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={`h-11 flex-row rounded-sm ${onBlue ? "bg-white/20" : "bg-light-surface-2 dark:bg-dark-surface-2"}`}
    >
      <Animated.View
        pointerEvents="none"
        className={`absolute bottom-0 left-0 top-0 rounded-sm ${onBlue ? "bg-white" : "bg-python-blue"}`}
        style={[{ width: WIDTH }, slide]}
      />
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          accessibilityRole="radio"
          accessibilityLabel={option}
          aria-checked={option === value}
          style={{ width: WIDTH }}
          className="items-center justify-center"
        >
          <Text
            className={`text-base font-bold ${
              onBlue
                ? option === value
                  ? "text-python-blue"
                  : "text-white"
                : option === value
                  ? "text-white"
                  : "text-light-secondary dark:text-dark-secondary"
            }`}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
