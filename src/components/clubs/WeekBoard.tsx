import { Pressable, View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, nextSchoolDay } from "@/components/system";
import {
  DAYS,
  MEETING_PERIODS,
  meetingDays,
  meetingPeriods,
} from "@/lib/discovery";
import { useLayout } from "@/theme/layout";
import type { Club } from "@/types/domain";

const SCHOOL_DAYS = DAYS.slice(0, 5);

function room(location: string) {
  return location === "TBD" ? "Room not listed" : location;
}

/**
 * The school week as a grid. Clubs meet in fixed slots, so this answers the
 * question students actually have: what can I go to when I'm free?
 */
export function WeekBoard({
  clubs,
  isJoined,
  onOpen,
}: {
  clubs: Club[];
  isJoined: (id: string) => boolean;
  onOpen: (id: string) => void;
}) {
  const { contentWidth, isDesktop } = useLayout();
  const stacked = contentWidth < 760;
  const today = nextSchoolDay();
  const rows: string[] = [...MEETING_PERIODS].sort(
    (a, b) =>
      ["Before School", "At Lunch", "After School"].indexOf(a) -
      ["Before School", "At Lunch", "After School"].indexOf(b),
  );
  const cell = (day: string, period: string) =>
    clubs.filter(
      (c) =>
        meetingDays(c.day).includes(day) &&
        meetingPeriods(c.time).includes(period),
    );
  const unscheduled = clubs.filter(
    (c) =>
      !meetingDays(c.day).some((d) => SCHOOL_DAYS.includes(d)) ||
      meetingPeriods(c.time).length === 0,
  );
  const name = (club: Club) => (
    <Pressable
      key={club.id}
      onPress={() => onOpen(club.id)}
      accessibilityRole="link"
      accessibilityLabel={`${club.name}, ${room(club.location)}`}
      className="min-h-9 flex-row items-start gap-1.5 py-1 hover:opacity-70"
    >
      {isJoined(club.id) ? (
        <View className="mt-2 h-2 w-2 rounded-full bg-python-green" />
      ) : null}
      <Text className="shrink text-base font-bold leading-5 text-light-text dark:text-dark-text">
        {club.name}
      </Text>
    </Pressable>
  );

  if (stacked) {
    return (
      <View className="gap-8">
        {SCHOOL_DAYS.map((day) => (
          <View key={day}>
            <Display size="md" className="border-b-2 border-light-text pb-1 text-light-text dark:border-dark-text dark:text-dark-text">
              {day}
            </Display>
            {rows.map((period) => {
              const list = cell(day, period);
              if (!list.length) return null;
              return (
                <View key={period} className="mt-3">
                  <Text className="text-sm text-light-muted dark:text-dark-muted">
                    {period}
                  </Text>
                  {list.map(name)}
                </View>
              );
            })}
          </View>
        ))}
        {unscheduled.length ? (
          <View>
            <Display size="sm">Other times</Display>
            {unscheduled.map(name)}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row border-b-2 border-light-text dark:border-dark-text">
        <View style={{ width: isDesktop ? 96 : 72 }} />
        {SCHOOL_DAYS.map((day) => (
          <View key={day} className="flex-1 px-3 pb-1">
            <Display
              size="md"
              className={
                day === today
                  ? "text-python-blue dark:text-python-blue-light"
                  : "text-light-text dark:text-dark-text"
              }
            >
              {day.slice(0, 3)}
            </Display>
          </View>
        ))}
      </View>
      {rows.map((period) => (
        <View
          key={period}
          className="flex-row border-b border-light-border dark:border-dark-border"
        >
          <View style={{ width: isDesktop ? 96 : 72 }} className="py-3">
            <Text className="text-sm font-bold text-light-muted dark:text-dark-muted">
              {period}
            </Text>
          </View>
          {SCHOOL_DAYS.map((day) => (
            <View
              key={day}
              className="flex-1 border-l border-light-border px-3 py-2 dark:border-dark-border"
              style={{ minHeight: 72, minWidth: 0 }}
            >
              {cell(day, period).map(name)}
            </View>
          ))}
        </View>
      ))}
      {unscheduled.length ? (
        <View className="mt-6">
          <Text className="mb-1 text-sm font-bold text-light-muted dark:text-dark-muted">
            Other times
          </Text>
          <View className="flex-row flex-wrap gap-x-6">
            {unscheduled.map(name)}
          </View>
        </View>
      ) : null}
    </View>
  );
}
