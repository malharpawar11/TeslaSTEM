import { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Club, clubInitials } from '@/types/domain';
import {
  PressableCard,
  PressableScale,
  Avatar,
  Tag,
  categoryTone,
} from '@/components/ui';
import { brand } from '@/theme/tokens';

interface Props {
  club: Club;
  followed: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
}

const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri',
};

function dayAbbr(day: string): string {
  return DAY_ABBR[day] ?? day.slice(0, 3);
}

function ClubCardBase({ club, followed, onPress, onToggleFollow }: Props) {
  const tone = categoryTone(club.category);
  const isBlue = tone !== 'brand';
  const iconColor = isBlue ? brand.blue : brand.green;
  const chipBg = isBlue ? 'bg-python-blue/12' : 'bg-python-green/12';
  const chipText = isBlue
    ? 'text-python-blue-dark dark:text-python-blue-light'
    : 'text-python-green-dark dark:text-python-green-light';

  return (
    <View className="mb-2.5">
      <PressableCard
        containsInteractive
        onPress={onPress}
        elevation="ambient"
        accessibilityLabel={`${club.name}, ${club.category} club. Open profile.`}
        className="overflow-hidden rounded-[28px] bg-light-surface p-3.5 dark:bg-dark-surface"
      >
        <View className="flex-row items-start gap-3">
          <Avatar size="sm" tone={tone} initials={clubInitials(club.name)} />

          <View className="flex-1">
            {/* Row 1: title + tag + follow icon */}
            <View className="flex-row items-center gap-2">
              <Text
                className="flex-1 text-[15px] font-bold tracking-tight text-light-text dark:text-dark-text"
                numberOfLines={1}
              >
                {club.name}
              </Text>
              <Tag label={club.category} tone={tone} size="sm" />
              <PressableScale
                onPress={onToggleFollow}
                accessibilityRole="button"
                accessibilityState={{ selected: followed }}
                accessibilityLabel={followed ? `Unfollow ${club.name}` : `Follow ${club.name}`}
                scaleTo={0.88}
                pressedOpacity={0.75}
                className={`h-[26px] w-[26px] items-center justify-center rounded-full ${
                  followed
                    ? 'bg-python-green'
                    : 'border border-python-green/40 bg-transparent'
                }`}
              >
                <Ionicons
                  name={followed ? 'checkmark' : 'add'}
                  size={13}
                  color={followed ? '#FFFFFF' : brand.green}
                />
              </PressableScale>
            </View>

            {/* Row 2: day chip + time · members */}
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <View className={`rounded-[5px] px-1.5 py-[2px] ${chipBg}`}>
                <Text className={`text-[10px] font-bold ${chipText}`}>
                  {dayAbbr(club.day)}
                </Text>
              </View>
              <Text
                className="flex-1 text-xs text-light-muted dark:text-dark-muted"
                numberOfLines={1}
              >
                {club.time}
                <Text className="text-light-subtle dark:text-dark-subtle">  ·  </Text>
                <Text className="font-semibold text-light-secondary dark:text-dark-secondary">
                  {club.memberCount}
                </Text>
                {' members'}
              </Text>
            </View>

            {/* Row 3: description (single line) */}
            <Text
              numberOfLines={1}
              className="mt-1 text-sm leading-5 text-light-secondary dark:text-dark-secondary"
            >
              {club.description}
            </Text>
          </View>
        </View>
      </PressableCard>
    </View>
  );
}

export const ClubCard = memo(ClubCardBase);
