import { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Club, clubInitials } from '@/types/domain';
import { PressableCard, PressableScale, Avatar, Tag, categoryAccent } from '@/components/ui';
import { brand, semantic } from '@/theme/tokens';

interface Props {
  club: Club;
  /** True once the student is an active member of this club. */
  joined: boolean;
  /** Pending approval at a club that vets joins. */
  pending?: boolean;
  onPress: () => void;
  onToggleJoin: () => void;
}

const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri',
};

function dayAbbr(day: string): string {
  return DAY_ABBR[day] ?? day.slice(0, 3);
}

/**
 * Directory row. The join control is a labelled button rather than a bare
 * icon: students should not have to guess what a circled plus does, and
 * "Joined" in green is the one place green earns its keep on this card.
 */
function ClubCardBase({ club, joined, pending = false, onPress, onToggleJoin }: Props) {
  const joinLabel = joined ? 'Joined' : pending ? 'Pending' : 'Join';
  const joinIcon = joined ? 'checkmark' : pending ? 'time-outline' : 'add';
  const joinColor = joined ? semantic.success : pending ? semantic.warn : brand.blue;
  const joinBox = joined
    ? 'border-python-green/40 bg-python-green/10 dark:bg-python-green/20'
    : pending
      ? 'border-warn/40 bg-warn/10 dark:bg-warn/20'
      : 'border-python-blue/40 bg-transparent';
  const joinText = joined
    ? 'text-python-green-dark dark:text-python-green-light'
    : pending
      ? 'text-warn'
      : 'text-python-blue-dark dark:text-python-blue-light';

  return (
    <View className="mb-2">
      <PressableCard
        containsInteractive
        onPress={onPress}
        elevation="ambient"
        accessibilityLabel={`${club.name}, ${club.category} club. Open profile.`}
        className="p-3.5"
      >
        <View className="flex-row items-start gap-3">
          <Avatar size="sm" tone={categoryAccent(club.category)} initials={clubInitials(club.name)} />

          <View className="flex-1">
            <View className="flex-row items-start gap-2">
              <Text
                className="flex-1 text-base font-semibold text-light-text dark:text-dark-text"
                numberOfLines={1}
              >
                {club.name}
              </Text>

              <PressableScale
                onPress={onToggleJoin}
                accessibilityRole="button"
                accessibilityState={{ selected: joined }}
                accessibilityLabel={joined ? `Leave ${club.name}` : `Join ${club.name}`}
                hitSlop={6}
                scaleTo={0.94}
                pressedOpacity={0.7}
                className={`h-7 flex-row items-center gap-1 rounded-md border px-2 ${joinBox}`}
              >
                <Ionicons name={joinIcon} size={12} color={joinColor} />
                <Text className={`text-2xs font-semibold ${joinText}`}>{joinLabel}</Text>
              </PressableScale>
            </View>

            <Text
              numberOfLines={2}
              className="mt-1 text-sm leading-5 text-light-muted dark:text-dark-muted"
            >
              {club.description}
            </Text>

            {/* Facts row: category, meeting day/time, size, all one weight. */}
            <View className="mt-2.5 flex-row flex-wrap items-center gap-x-2 gap-y-1.5">
              <Tag label={club.category} size="sm" />
              <Text className="text-xs text-light-muted dark:text-dark-muted">
                {dayAbbr(club.day)} · {club.time}
              </Text>
              {club.memberCount > 0 ? (
                <Text className="text-xs text-light-muted dark:text-dark-muted">
                  · {club.memberCount} member{club.memberCount === 1 ? '' : 's'}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </PressableCard>
    </View>
  );
}

export const ClubCard = memo(ClubCardBase);
