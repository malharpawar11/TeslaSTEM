import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useReducedMotion } from "@/components/CampusVisual";
import { Display, useHover, webFade } from "@/components/system";
import { schoolDayKey } from "@/lib/calendar";
import { useLayout } from "@/theme/layout";
import { easing } from "@/theme/motion";
import type { ClubEvent } from "@/types/domain";
import { label, monthGrid, todayKey } from "./dates";

const HEADINGS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Clubs meet on school days, so weekends only get a narrow strip. */
const WEEKEND_ROOMY = 58;
const WEEKEND_TIGHT = 44;

const Day = memo(function Day({
  dateKey,
  day,
  events,
  selected,
  today,
  past,
  weekend,
  labelled,
  height,
  width,
  onPress,
}: {
  dateKey: string;
  day: number;
  events: ClubEvent[];
  selected: boolean;
  today: boolean;
  past: boolean;
  weekend: boolean;
  labelled: boolean;
  height: number;
  width: number | undefined;
  onPress: (key: string) => void;
}) {
  const { hovered, hoverProps } = useHover();
  const count = events.length;
  const deadlines = events.filter((e) => e.eventType === "Deadline").length;
  const showLabels = labelled && !weekend;
  // Two labels fit; a busier day keeps one and states how many follow.
  const visible = showLabels ? events.slice(0, count > 2 ? 1 : 2) : [];
  const number = selected
    ? "text-white"
    : count
      ? "text-light-text dark:text-dark-text"
      : past
        ? "text-light-border-strong dark:text-dark-border-strong"
        : "text-light-muted dark:text-dark-muted";
  return (
    <Pressable
      onPress={() => onPress(dateKey)}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={`${label(dateKey, { weekday: "long", month: "long", day: "numeric" })}${today ? ", today" : ""}, ${count ? `${count} ${count === 1 ? "event" : "events"}${deadlines ? `, ${deadlines} ${deadlines === 1 ? "deadline" : "deadlines"}` : ""}` : "no events"}`}
      aria-pressed={selected}
      className={`border-b border-light-hairline p-1.5 dark:border-dark-hairline ${hovered && !selected ? "bg-light-surface-2 dark:bg-dark-surface" : ""}`}
      style={[
        { height },
        width ? { width } : { flex: 1 },
        webFade("background-color"),
      ]}
    >
      <View className="flex-row items-center justify-between">
        <View
          className={`items-center justify-center rounded-sm ${today ? "bg-laurel" : ""}`}
          style={{ minWidth: 32, height: 32, paddingHorizontal: 3, alignSelf: "flex-start" }}
        >
          <Display fontSize={26} className={today ? "text-ink-night" : number}>
            {day}
          </Display>
        </View>
        {labelled && weekend && count > 0 ? (
          <Text
            className={`pr-0.5 text-xs font-bold ${selected ? "text-white" : "text-python-blue dark:text-python-blue-light"}`}
          >
            {count}
          </Text>
        ) : null}
      </View>
      {showLabels ? (
        <View className="mt-1" style={{ gap: 3 }}>
          {visible.map((event) => {
            const deadline = event.eventType === "Deadline";
            return (
              <View
                key={event.id}
                className={`rounded-sm ${deadline ? (selected ? "bg-white" : "bg-python-blue") : ""} ${deadline ? "px-1" : ""}`}
              >
                <Text
                  numberOfLines={1}
                  className={`text-xs font-bold ${
                    deadline
                      ? selected
                        ? "text-python-blue"
                        : "text-white"
                      : selected
                        ? "text-white"
                        : "text-light-secondary dark:text-dark-secondary"
                  }`}
                >
                  {event.title}
                </Text>
              </View>
            );
          })}
          {count > 2 ? (
            <Text
              className={`text-xs font-bold ${selected ? "text-white" : "text-python-blue dark:text-python-blue-light"}`}
            >
              {count - 1} more
            </Text>
          ) : null}
        </View>
      ) : !labelled && count > 0 ? (
        <View className="mt-1 flex-row" style={{ gap: 3 }}>
          {events.slice(0, 3).map((event) => (
            <View
              key={event.id}
              className={selected ? "bg-white" : "bg-python-blue"}
              style={{
                height: 5,
                width: event.eventType === "Deadline" ? 13 : 5,
                borderRadius: 1,
              }}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
});

export function MonthGrid({
  month,
  direction,
  events,
  selected,
  onSelect,
}: {
  month: string;
  direction: 1 | -1;
  events: ClubEvent[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const { contentWidth } = useLayout();
  const reduced = useReducedMotion();
  const today = todayKey();
  const labelled = contentWidth >= 720;
  const cellHeight = labelled ? 90 : 62;
  const weekendWidth = labelled ? WEEKEND_ROOMY : WEEKEND_TIGHT;
  const [gridWidth, setGridWidth] = useState(0);

  const byDay = useMemo(() => {
    const map = new Map<string, ClubEvent[]>();
    for (const event of events) {
      const key = schoolDayKey(event.startsAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const { lead, days, rows } = monthGrid(month);
  const dayWidth = gridWidth ? (gridWidth - weekendWidth * 2) / 5 : 0;

  // One blue block moves between dates rather than each cell flipping colour.
  const inMonth = selected?.startsWith(month) ? selected : null;
  const slot = inMonth ? lead + Number(inMonth.slice(8)) - 1 : -1;
  const column = slot % 7;
  const targetX = column < 5 ? column * dayWidth : 5 * dayWidth + (column - 5) * weekendWidth;
  const targetY = Math.floor(slot / 7) * cellHeight;
  const targetW = column < 5 ? dayWidth : weekendWidth;
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (slot < 0 || !gridWidth) {
      opacity.value = 0;
      return;
    }
    const jump = reduced || opacity.value === 0;
    const go = (to: number) =>
      jump ? to : withTiming(to, { duration: 180, easing: easing.emphasized });
    x.value = go(targetX);
    y.value = go(targetY);
    w.value = go(targetW);
    opacity.value = 1;
  }, [slot, gridWidth, targetX, targetY, targetW, reduced, x, y, w, opacity]);
  const block = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: w.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  const select = (key: string) => onSelect(selected === key ? null : key);

  return (
    <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
      <View className="flex-row border-b-2 border-light-text pb-1.5 dark:border-dark-text">
        {HEADINGS.map((heading, i) => (
          <View
            key={heading}
            style={i > 4 ? { width: weekendWidth } : { flex: 1 }}
            className="pl-1.5"
          >
            <Text
              className={`font-bold ${labelled ? "text-base" : "text-sm"} ${i > 4 ? "text-light-muted dark:text-dark-muted" : "text-light-text dark:text-dark-text"}`}
            >
              {labelled ? heading : heading.slice(0, i === 3 || i === 1 ? 2 : 1)}
            </Text>
          </View>
        ))}
      </View>
      <Animated.View
        key={month}
        entering={
          reduced
            ? undefined
            : (direction > 0 ? FadeInRight : FadeInLeft).duration(180)
        }
      >
        <Animated.View
          pointerEvents="none"
          className="absolute left-0 top-0 rounded-sm bg-python-blue"
          style={[{ height: cellHeight - 1 }, block]}
        />
        {Array.from({ length: rows }, (_, row) => (
          <View key={row} className="flex-row">
            {Array.from({ length: 7 }, (__, col) => {
              const day = row * 7 + col - lead + 1;
              const width = col > 4 ? weekendWidth : undefined;
              if (day < 1 || day > days)
                return (
                  <View
                    key={col}
                    className="border-b border-light-hairline dark:border-dark-hairline"
                    style={[
                      { height: cellHeight },
                      width ? { width } : { flex: 1 },
                    ]}
                  />
                );
              const key = `${month}-${String(day).padStart(2, "0")}`;
              return (
                <Day
                  key={key}
                  dateKey={key}
                  day={day}
                  events={byDay.get(key) ?? EMPTY}
                  selected={selected === key}
                  today={key === today}
                  past={key < today}
                  weekend={col > 4}
                  labelled={labelled}
                  height={cellHeight}
                  width={width}
                  onPress={select}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const EMPTY: ClubEvent[] = [];
