import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { Display, useHover, webFade } from "@/components/system";
import { easing } from "@/theme/motion";

const ROW = 42;

function Row({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const empty = count === 0 && !active;
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${label}, ${count} clubs`}
      style={{ height: ROW }}
      className="flex-row items-center justify-between px-3"
    >
      <View
        style={[
          { transform: [{ translateX: hovered && !active ? 5 : 0 }] },
          webFade("transform"),
        ]}
      >
        <Display
          fontSize={28}
          className={
            active
              ? "text-white"
              : empty
                ? "text-light-subtle dark:text-dark-subtle"
                : "text-light-text dark:text-dark-text"
          }
        >
          {label}
        </Display>
      </View>
      <Text
        className={`text-base font-bold ${active ? "text-white" : "text-light-muted dark:text-dark-muted"}`}
      >
        {count}
      </Text>
    </Pressable>
  );
}

/**
 * Categories as a printed index, set in the same type as the homepage. One
 * blue block slides between rows, so a change reads as a move and not a blink.
 */
export function CategoryIndex({
  options,
  value,
  counts,
  onChange,
}: {
  options: string[];
  value: string;
  counts: Record<string, number>;
  onChange: (next: string) => void;
}) {
  const reduced = useReducedMotion();
  const index = Math.max(0, options.indexOf(value));
  const y = useSharedValue(index * ROW);
  useEffect(() => {
    y.value = reduced
      ? index * ROW
      : withTiming(index * ROW, { duration: 220, easing: easing.emphasized });
  }, [index, reduced, y]);
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Category">
      <Animated.View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 rounded-sm bg-python-blue"
        style={[{ height: ROW }, slide]}
      />
      {options.map((option) => (
        <Row
          key={option}
          label={option === "All" ? "All clubs" : option}
          count={counts[option] ?? 0}
          active={option === value}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  );
}
