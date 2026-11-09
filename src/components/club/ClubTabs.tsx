import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { useHover, webFade } from "@/components/system";
import { CLUB } from "./tokens";

export const clubTabId = (tab: string) => `club-tab-${tab.toLowerCase()}`;
export const clubPanelId = (tab: string) => `club-panel-${tab.toLowerCase()}`;

// The strip scrolls sideways, which would clip a ring drawn outside the tab.
const INSET_FOCUS =
  Platform.OS === "web" ? ({ outlineOffset: -2 } as object) : undefined;
const TAB_PADDING = 6;

function ClubTab({
  name,
  count,
  active,
  onPress,
  onLayout,
  register,
}: {
  name: string;
  count?: number;
  active: boolean;
  onPress: () => void;
  onLayout: (x: number, width: number) => void;
  register: (node: unknown) => void;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      ref={register as never}
      onPress={onPress}
      onLayout={(event) =>
        onLayout(event.nativeEvent.layout.x, event.nativeEvent.layout.width)
      }
      {...hoverProps}
      {...({ tabIndex: active ? 0 : -1 } as object)}
      nativeID={clubTabId(name)}
      accessibilityRole="tab"
      aria-selected={active}
      aria-controls={clubPanelId(name)}
      className="h-12 flex-row items-center gap-1.5 px-1.5"
      style={INSET_FOCUS}
    >
      <Text
        className={`text-base font-bold ${
          active || hovered
            ? "text-light-text dark:text-dark-text"
            : "text-light-muted dark:text-dark-muted"
        }`}
        style={webFade("color")}
      >
        {name}
      </Text>
      {count ? (
        <Text className="text-xs text-light-muted dark:text-dark-muted">
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** The club page's sections, with one underline that travels between them. */
export function ClubTabs<T extends string>({
  tabs,
  value,
  onChange,
  counts,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (next: T) => void;
  counts: Partial<Record<T, number>>;
}) {
  const reduced = useReducedMotion();
  const [rects, setRects] = useState<
    Record<string, { x: number; width: number }>
  >({});
  const nodes = useRef<Record<string, { focus?: () => void } | null>>({});
  const scroller = useRef<ScrollView>(null);
  const placed = useRef(false);
  const left = useSharedValue(0);
  const span = useSharedValue(0);
  const rect = rects[value];

  useEffect(() => {
    if (!rect) return;
    const animate = placed.current && !reduced;
    placed.current = true;
    const x = rect.x + TAB_PADDING;
    const wide = rect.width - TAB_PADDING * 2;
    left.value = animate ? withTiming(x, { duration: CLUB.tabMs }) : x;
    span.value = animate ? withTiming(wide, { duration: CLUB.tabMs }) : wide;
    scroller.current?.scrollTo({
      x: Math.max(0, rect.x - 48),
      animated: !reduced,
    });
  }, [rect?.x, rect?.width, reduced, left, span]);

  const underline = useAnimatedStyle(() => ({
    width: span.value,
    transform: [{ translateX: left.value }],
  }));

  const onKeyDown = (event: {
    nativeEvent: { key: string };
    preventDefault?: () => void;
  }) => {
    const index = tabs.indexOf(value);
    const key = event.nativeEvent.key;
    const next =
      key === "ArrowRight"
        ? (index + 1) % tabs.length
        : key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : key === "Home"
            ? 0
            : key === "End"
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault?.();
    onChange(tabs[next]);
    nodes.current[tabs[next]]?.focus?.();
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      ref={scroller}
    >
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Club sections"
        className="relative flex-row gap-4"
        style={{ marginLeft: -TAB_PADDING }}
        {...(Platform.OS === "web" ? ({ onKeyDown } as object) : null)}
      >
        {tabs.map((tab) => (
          <ClubTab
            key={tab}
            name={tab}
            count={counts[tab]}
            active={tab === value}
            onPress={() => onChange(tab)}
            register={(node) => {
              nodes.current[tab] = node as { focus?: () => void } | null;
            }}
            onLayout={(x, width) =>
              setRects((prev) =>
                prev[tab]?.x === x && prev[tab]?.width === width
                  ? prev
                  : { ...prev, [tab]: { x, width } },
              )
            }
          />
        ))}
        <Animated.View
          pointerEvents="none"
          className="absolute bottom-0 left-0 h-0.5 bg-python-blue"
          style={underline}
        />
      </View>
    </ScrollView>
  );
}
