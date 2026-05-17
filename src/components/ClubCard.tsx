import { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Club, categoryColor, clubInitials } from '@/types/domain';
import { PressableScale } from './PressableScale';

interface Props {
  club: Club;
  followed: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
}

function ClubCardBase({ club, followed, onPress, onToggleFollow }: Props) {
  const cat = categoryColor(club.category);

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${club.name}, ${club.category} club. Open profile.`}
      className="mb-4 rounded-2xl border border-light-border bg-light-card p-4 shadow-sm shadow-black/5 dark:border-dark-border dark:bg-dark-card"
    >
      <View className="flex-row items-start gap-3">
        <View className={`h-14 w-14 items-center justify-center rounded-2xl ${cat.bg}`}>
          <Text className="text-lg font-extrabold text-white">{clubInitials(club.name)}</Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-lg font-extrabold text-light-text dark:text-dark-text">
              {club.name}
            </Text>
            <View className={`rounded-full px-3 py-1 ${cat.bg}`}>
              <Text className="text-xs font-bold text-white">{club.category}</Text>
            </View>
          </View>

          <Text
            numberOfLines={2}
            className="mt-1 text-sm leading-5 text-light-muted dark:text-dark-muted"
          >
            {club.description}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Ionicons name="calendar-outline" size={15} color="#4CAF50" />
        <Text className="text-sm font-semibold text-python-green">
          {club.day} · {club.time}
        </Text>
      </View>

      <View className="mt-1 flex-row items-center justify-between">
        <Text className="flex-1 text-xs text-light-muted dark:text-dark-muted">
          {club.location} · Advisor {club.advisor}
        </Text>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="people" size={16} color="#1565C0" />
          <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
            {club.memberCount} members
          </Text>
        </View>

        <PressableScale
          onPress={onToggleFollow}
          accessibilityRole="button"
          accessibilityState={{ selected: followed }}
          accessibilityLabel={followed ? `Unfollow ${club.name}` : `Follow ${club.name}`}
          className={`h-9 flex-row items-center gap-1.5 rounded-full border px-4 ${
            followed ? 'border-python-green bg-python-green' : 'border-python-green bg-transparent'
          }`}
        >
          <Ionicons
            name={followed ? 'checkmark-circle' : 'add-circle-outline'}
            size={16}
            color={followed ? '#FFFFFF' : '#4CAF50'}
          />
          <Text
            className={`text-sm font-bold ${followed ? 'text-white' : 'text-python-green'}`}
          >
            {followed ? 'Following' : 'Follow'}
          </Text>
        </PressableScale>
      </View>
    </PressableScale>
  );
}

export const ClubCard = memo(ClubCardBase);
