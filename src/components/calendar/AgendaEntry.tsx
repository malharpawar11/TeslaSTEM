import { Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, TextLink } from "@/components/system";
import { downloadIcs, formatEventTime, openGoogleCalendar } from "@/lib/calendar";
import type { ClubEvent } from "@/types/domain";
import { startClock } from "./dates";

/** One line of a day's agenda: the time holds the left edge, like a timetable. */
export function AgendaEntry({ event }: { event: ClubEvent }) {
  const router = useRouter();
  const cancelled = event.status === "cancelled";
  const deadline = event.eventType === "Deadline";
  const { clock, meridiem } = startClock(event.startsAt);
  const range = formatEventTime(event);
  const ends = range.includes("–") ? range.split("–")[1].trim() : null;
  return (
    <View className="flex-row gap-4 border-b border-light-border py-5 dark:border-dark-border">
      <View style={{ width: 66 }}>
        {event.dateOnly ? (
          <Display fontSize={24}>All day</Display>
        ) : (
          <>
            <Display fontSize={32}>{clock}</Display>
            <Text className="text-sm font-bold text-light-muted dark:text-dark-muted">
              {meridiem}
            </Text>
            {ends ? (
              <Text className="mt-1 text-xs text-light-muted dark:text-dark-muted">
                until {ends}
              </Text>
            ) : null}
          </>
        )}
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <View className="flex-row flex-wrap items-center gap-x-2.5 gap-y-1">
          {event.clubName ? (
            <Pressable
              onPress={() => router.push(`/club/${event.clubId}`)}
              accessibilityRole="link"
              accessibilityLabel={`Open ${event.clubName}`}
              className="hover:opacity-70"
            >
              <Text className="text-sm font-bold text-python-blue dark:text-python-blue-light">
                {event.clubName}
              </Text>
            </Pressable>
          ) : null}
          {deadline ? (
            <View className="rounded-sm bg-python-blue px-1.5 py-0.5">
              <Text className="text-xs font-bold text-white">Deadline</Text>
            </View>
          ) : (
            <Text className="text-sm text-light-muted dark:text-dark-muted">
              {event.eventType}
            </Text>
          )}
          {cancelled ? (
            <Text className="text-sm font-bold text-danger">Cancelled</Text>
          ) : null}
        </View>
        <Display
          fontSize={34}
          className={`mt-0.5 text-light-text dark:text-dark-text ${cancelled ? "line-through opacity-60" : ""}`}
        >
          {event.title}
        </Display>
        {event.location ? (
          <Text className="mt-1 text-base font-bold text-light-text dark:text-dark-text">
            {event.location}
          </Text>
        ) : null}
        {event.organizer ? (
          <Text className="text-sm text-light-muted dark:text-dark-muted">
            {event.organizer}
          </Text>
        ) : null}
        {event.description ? (
          <Text
            numberOfLines={3}
            className="mt-1.5 max-w-xl text-base leading-6 text-light-secondary dark:text-dark-secondary"
          >
            {event.description}
          </Text>
        ) : null}
        {!cancelled ? (
          <View className="mt-1 flex-row flex-wrap gap-x-5">
            <TextLink
              label="Add to Google Calendar"
              onPress={() => void openGoogleCalendar(event)}
            />
            <TextLink
              label={Platform.OS === "web" ? "Download .ics" : "Apple or other"}
              accessibilityLabel="Add to Apple or device calendar"
              onPress={() => void downloadIcs([event], event.title)}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
