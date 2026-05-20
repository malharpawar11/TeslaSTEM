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

function ClubCardBase({ club, followed, onPress, onToggleFollow }: Props) {
  const tone = categoryTone(club.category);
  const accentColor = tone === 'brand' ? brand.green : brand.blue;
  const iconColor = tone === 'brand' ? brand.green : brand.blue;

  return (
    <View className="mb-3.5">
      <PressableCard
        containsInteractive
        onPress={onPress}
        elevation="ambient"
        accessibilityLabel={`${club.name}, ${club.category} club. Open profile.`}
        className="overflow-hidden rounded-3xl border-light-hairline bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface"
      >
        {/* Editorial category accent bar */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: accentColor,
            opacity: 0.9,
          }}
        />

        {/* Top: avatar + name lockup + category tag */}
        <View className="flex-row items-start gap-3.5">
          <Avatar
            size="lg"
            tone={tone}
            initials={clubInitials(club.name)}
          />

          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-2.5">
              <Text
                className="flex-1 text-lg font-bold tracking-tight text-light-text dark:text-dark-text"
                numberOfLines={2}
              >
                {club.name}
              </Text>
              <View className="pt-0.5">
                <Tag label={club.category} tone={tone} size="sm" />
              </View>
            </View>

            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={12} color={iconColor} />
              <Text
                className="text-xs font-medium text-light-muted dark:text-dark-muted"
                numberOfLines={1}
              >
                {club.day}
                <Text className="text-light-subtle dark:text-dark-subtle">  ·  </Text>
                {club.time}
              </Text>
            </View>

            <Text
              numberOfLines={2}
              className="mt-2 text-sm leading-5 text-light-secondary dark:text-dark-secondary"
            >
              {club.description}
            </Text>
          </View>
        </View>

        {/* Hairline divider */}
        <View className="mt-3.5 h-px bg-light-hairline dark:bg-dark-border" />

        {/* Footer row: meta + follow */}
        <View className="mt-3 flex-row items-center justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-1.5">
            <Ionicons name="people" size={13} color={iconColor} />
            <Text
              className="flex-1 text-xs text-light-muted dark:text-dark-muted"
              numberOfLines={1}
            >
              <Text className="font-semibold text-light-secondary dark:text-dark-secondary">
                {club.memberCount}
              </Text>
              <Text> members  ·  </Text>
              <Text numberOfLines={1}>{club.location}</Text>
            </Text>
          </View>

          <PressableScale
            onPress={onToggleFollow}
            accessibilityRole="button"
            accessibilityState={{ selected: followed }}
            accessibilityLabel={
              followed ? `Unfollow ${club.name}` : `Follow ${club.name}`
            }
            scaleTo={0.94}
            pressedOpacity={0.85}
            className={`h-9 flex-row items-center justify-center gap-1.5 rounded-full px-3.5 ${
              followed
                ? 'bg-python-green'
                : 'border border-python-green bg-transparent'
            }`}
          >
            <Ionicons
              name={followed ? 'checkmark' : 'add'}
              size={14}
              color={followed ? '#FFFFFF' : brand.green}
            />
            <Text
              className={`text-xs font-bold tracking-tight ${
                followed ? 'text-white' : 'text-python-green-dark dark:text-python-green-light'
              }`}
            >
              {followed ? 'Following' : 'Follow'}
            </Text>
          </PressableScale>
        </View>
      </PressableCard>
    </View>
  );
}

export const ClubCard = memo(ClubCardBase);
