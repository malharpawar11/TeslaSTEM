import { View } from "react-native";
import { useRouter } from "expo-router";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Display, TextLink } from "@/components/system";
import { Button } from "@/components/ui";
import type { Club } from "@/types/domain";

export interface EmptyCopy {
  title: string;
  body: string;
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
  /** The student's own clubs: what is on their real week, even with no events. */
  regulars?: Club[];
}

export function CalendarEmpty({ copy }: { copy: EmptyCopy }) {
  const router = useRouter();
  return (
    <View className="py-6">
      <Display size="lg" accessibilityLiveRegion="polite">
        {copy.title}
      </Display>
      <Text className="mt-2 max-w-md text-lg leading-7 text-light-secondary dark:text-dark-secondary">
        {copy.body}
      </Text>
      {copy.primary || copy.secondary ? (
        <View className="mt-5 flex-row flex-wrap items-center gap-x-6 gap-y-2">
          {copy.primary ? (
            <Button
              label={copy.primary.label}
              size="lg"
              onPress={copy.primary.onPress}
            />
          ) : null}
          {copy.secondary ? (
            <TextLink
              label={copy.secondary.label}
              onPress={copy.secondary.onPress}
            />
          ) : null}
        </View>
      ) : null}
      {copy.regulars?.length ? (
        <View className="mt-9">
          <Text className="mb-1 text-base font-bold text-light-text dark:text-dark-text">
            Your clubs' usual meetings
          </Text>
          {copy.regulars.map((club) => (
            <View
              key={club.id}
              className="flex-row flex-wrap items-baseline justify-between gap-x-5 border-b border-light-border py-3 dark:border-dark-border"
            >
              <Display
                fontSize={28}
                className="text-light-text dark:text-dark-text"
                onPress={() => router.push(`/club/${club.id}`)}
              >
                {club.name}
              </Display>
              <Text className="text-sm text-light-secondary dark:text-dark-secondary">
                {club.day}, {club.time}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
