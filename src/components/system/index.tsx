import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextProps,
  View,
  ViewStyle,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { useTheme } from "@/context/ThemeContext";
import { easing } from "@/theme/motion";
import { useLayout } from "@/theme/layout";
import { surface } from "@/theme/tokens";

/** CSS transition for hover states; native has no hover to transition. */
export function webFade(properties: string) {
  return Platform.OS === "web"
    ? ({ transitionProperty: properties, transitionDuration: "140ms" } as object)
    : null;
}

/** position: sticky within the page's scroller. Web only. */
export function webSticky(top: number) {
  return Platform.OS === "web"
    ? ({ position: "sticky", top } as object)
    : null;
}

/** Hover state for pressables; no-op on touch, which never fires hover. */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    hoverProps: {
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    },
  };
}

const DISPLAY_SIZE = {
  xs: [22, 24],
  sm: [28, 30],
  md: [38, 40],
  lg: [54, 54],
  xl: [76, 74],
} as const;

/** Big Shoulders Display. Sizes step down one notch on phones. */
export function Display({
  size = "md",
  fontSize,
  className,
  style,
  ...rest
}: TextProps & {
  size?: keyof typeof DISPLAY_SIZE;
  fontSize?: number;
  className?: string;
}) {
  const { contentWidth } = useLayout();
  const order = Object.keys(DISPLAY_SIZE) as (keyof typeof DISPLAY_SIZE)[];
  const step =
    contentWidth < 640 ? order[Math.max(0, order.indexOf(size) - 1)] : size;
  const [fs, lh] = DISPLAY_SIZE[step];
  return (
    <Text
      {...rest}
      className={`font-display ${className ?? "text-light-text dark:text-dark-text"}`}
      style={[
        {
          fontSize: fontSize ?? fs,
          lineHeight: fontSize ? fontSize * 0.98 : lh,
        },
        style,
      ]}
    />
  );
}

/**
 * Page wrapper: owns scrolling, gutters and the one transition every route
 * shares, a short settle when the screen comes into focus.
 */
export function Page({
  children,
  onRefresh,
  refreshing = false,
  maxWidth = 1560,
  bleed = false,
  bottomInset = 56,
  onScrollY,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  maxWidth?: number;
  /** Children handle their own gutters (full-bleed hero and so on). */
  bleed?: boolean;
  bottomInset?: number;
  onScrollY?: (y: number) => void;
}) {
  const { gutter } = useLayout();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (focused)
      progress.value = reduced
        ? 1
        : withTiming(1, { duration: 280, easing: easing.emphasized });
    else progress.value = reduced ? 1 : 0;
  }, [focused, reduced, progress]);
  const settle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));
  const padded: ViewStyle = bleed
    ? {}
    : {
        paddingHorizontal: gutter,
        paddingTop: insets.top + 28,
        maxWidth,
        width: "100%",
        alignSelf: "center",
      };
  return (
    <ScrollView
      className="flex-1 bg-light-bg dark:bg-dark-bg"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      scrollEventThrottle={16}
      onScroll={
        onScrollY
          ? (event) => onScrollY(event.nativeEvent.contentOffset.y)
          : undefined
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <Animated.View style={[settle, padded]}>{children}</Animated.View>
    </ScrollView>
  );
}

/** Screen title with a plain-language line and optional controls at right. */
export function PageHead({
  title,
  detail,
  trailing,
}: {
  title: string;
  detail?: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="mb-8 flex-row flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <View className="shrink">
        <Display size="xl" accessibilityRole="header">
          {title}
        </Display>
        {detail ? (
          <Text className="mt-2 max-w-xl text-base text-light-muted dark:text-dark-muted">
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

/** Section heading on a rule. Structure, not ornament: it starts a new list. */
export function Rule({
  title,
  trailing,
  className,
}: {
  title: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`flex-row items-end justify-between gap-4 border-b-2 border-light-text pb-2 dark:border-dark-text ${className ?? ""}`}
    >
      <Display size="sm" accessibilityRole="header">
        {title}
      </Display>
      {trailing}
    </View>
  );
}

/** Underlined text options: sorting, scopes, tabs. Replaces rows of pills. */
export function TextTabs<T extends string>({
  options,
  value,
  onChange,
  counts,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  counts?: Partial<Record<T, number>>;
  label: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      className="flex-row flex-wrap gap-x-5 gap-y-1"
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-h-11 flex-row items-center gap-1.5 border-b-2 ${
              active
                ? "border-python-blue"
                : "border-transparent hover:border-light-border-strong dark:hover:border-dark-border-strong"
            }`}
          >
            <Text
              className={`text-base ${
                active
                  ? "font-bold text-light-text dark:text-dark-text"
                  : "text-light-muted dark:text-dark-muted"
              }`}
            >
              {option}
            </Text>
            {counts?.[option] != null ? (
              <Text className="text-xs text-light-muted dark:text-dark-muted">
                {counts[option]}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Square check row. Reads as a form control because it is one. */
export function Check({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      className="min-h-11 flex-row items-center gap-3"
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-sm border-2 ${
          checked
            ? "border-python-blue bg-python-blue"
            : "border-light-border-strong dark:border-dark-border-strong"
        }`}
      >
        {checked ? <CheckGlyph /> : null}
      </View>
      <View className="shrink">
        <Text className="text-base text-light-text dark:text-dark-text">
          {label}
        </Text>
        {hint ? (
          <Text className="text-xs text-light-muted dark:text-dark-muted">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function CheckGlyph() {
  return <Ionicons name="checkmark" size={14} color="#FFF" />;
}

/** Icon coloured for the current sheet; saves threading isDark everywhere. */
export function Glyph({
  name,
  size = 18,
  tone = "muted",
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  tone?: "text" | "secondary" | "muted";
}) {
  const { isDark } = useTheme();
  return <Ionicons name={name} size={size} color={surface(isDark)[tone]} />;
}

/** Text-only action. The default for anything that isn't the page's main job. */
export function TextLink({
  label,
  onPress,
  icon,
  accessibilityLabel,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      {...hoverProps}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      className={`min-h-11 flex-row items-center gap-1.5 ${disabled ? "opacity-50" : ""}`}
    >
      {icon ? <Glyph name={icon} size={16} tone="secondary" /> : null}
      <Text
        className={`text-sm font-bold text-light-secondary dark:text-dark-secondary ${hovered ? "underline" : ""}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Pacific-time weekday, Mon–Fri, for "what's on next" prompts. */
export function nextSchoolDay(): string {
  const name = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/Los_Angeles",
  });
  return ["Saturday", "Sunday"].includes(name) ? "Monday" : name;
}

export function useRefresher(run: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);
  return { refreshing, onRefresh };
}
