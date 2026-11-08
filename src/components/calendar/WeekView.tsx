import { Pressable, View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, useHover, webFade } from "@/components/system";
import { formatEventTime, schoolDayKey } from "@/lib/calendar";
import { useLayout } from "@/theme/layout";
import type { ClubEvent } from "@/types/domain";
import { addDays, dayOf, label, todayKey } from "./dates";

function WeekItem({
  event,
  onPress,
}: {
  event: ClubEvent;
  onPress: () => void;
}) {
  const { hovered, hoverProps } = useHover();
  const deadline = event.eventType === "Deadline";
  return (
    <Pressable
      onPress={onPress}
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.clubName ?? ""}. Open this day.`}
      className="border-t border-light-border py-2.5 dark:border-dark-border"
    >
      {deadline ? (
        <View className="mb-1 self-start rounded-sm bg-python-blue px-1.5 py-0.5">
          <Text className="text-xs font-bold text-white">Deadline</Text>
        </View>
      ) : null}
      <Text className="text-sm font-bold text-light-text dark:text-dark-text">
        {event.dateOnly ? "All day" : formatEventTime(event).split("–")[0].trim()}
      </Text>
      <Display
        fontSize={24}
        className={
          hovered
            ? "text-python-blue dark:text-python-blue-light"
            : "text-light-text dark:text-dark-text"
        }
        style={webFade("color")}
      >
        {event.title}
      </Display>
      {event.clubName ? (
        <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
          {event.clubName}
        </Text>
      ) : null}
      {event.location ? (
        <Text className="text-sm text-light-secondary dark:text-dark-secondary">
          {event.location}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Seven days side by side, or stacked on phones, with full event details. */
export function WeekView({
  start,
  events,
  onOpenDay,
}: {
  start: string;
  events: ClubEvent[];
  onOpenDay: (key: string) => void;
}) {
  const { contentWidth } = useLayout();
  const stacked = contentWidth < 760;
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const on = (key: string) =>
    events.filter((event) => schoolDayKey(event.startsAt) === key);
  return (
    <View className={stacked ? "gap-5" : "flex-row"}>
      {days.map((key, i) => {
        const list = on(key);
        const isToday = key === today;
        if (stacked && list.length === 0 && i > 4) return null;
        return (
          <View
            key={key}
            className={stacked ? "" : `border-l border-light-border px-3 dark:border-dark-border ${i === 0 ? "border-l-0 pl-0" : ""}`}
            style={stacked ? undefined : i > 4 ? { flex: 0.62, minWidth: 0 } : { flex: 1, minWidth: 0 }}
          >
            <View className="flex-row items-baseline gap-2 pb-2">
              <Display
                fontSize={46}
                className={
                  isToday
                    ? "text-python-blue dark:text-python-blue-light"
                    : list.length
                      ? "text-light-text dark:text-dark-text"
                      : "text-light-muted dark:text-dark-muted"
                }
              >
                {dayOf(key)}
              </Display>
              <Text className="text-base font-bold text-light-secondary dark:text-dark-secondary">
                {label(key, { weekday: "short" })}
              </Text>
            </View>
            {list.map((event) => (
              <WeekItem
                key={event.id}
                event={event}
                onPress={() => onOpenDay(key)}
              />
            ))}
            {stacked && list.length === 0 ? (
              <Text className="text-sm text-light-muted dark:text-dark-muted">
                Nothing scheduled
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
