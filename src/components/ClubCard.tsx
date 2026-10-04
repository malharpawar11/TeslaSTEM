import { memo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Club, clubInitials } from "@/types/domain";
import {
  PressableCard,
  PressableScale,
  Avatar,
  Tag,
  categoryAccent,
} from "@/components/ui";
import { brand, semantic } from "@/theme/tokens";
interface Props {
  club: Club;
  joined: boolean;
  pending?: boolean;
  onPress: () => void;
  onToggleJoin: () => void;
}
function ClubCardBase({
  club,
  joined,
  pending = false,
  onPress,
  onToggleJoin,
}: Props) {
  const label = joined ? "Joined" : pending ? "Pending" : "Join club";
  const color = joined
    ? semantic.success
    : pending
      ? semantic.warn
      : brand.blue;
  return (
    <View className="mb-4">
      <PressableCard
        containsInteractive
        onPress={onPress}
        elevation="ambient"
        accessibilityLabel={`${club.name}, ${club.category} club. Open profile.`}
        className="overflow-hidden p-5"
      >
        <View className="flex-row items-center gap-3">
          <Avatar
            size="md"
            tone={categoryAccent(club.category)}
            initials={clubInitials(club.name)}
          />
          <View className="flex-1">
            <View className="self-start">
              <Tag label={club.category} size="sm" />
            </View>
            <Text className="mt-2 text-xl font-bold tracking-tight text-light-text dark:text-dark-text">
              {club.name}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color={brand.blue} />
        </View>
        <Text
          numberOfLines={2}
          className="mt-4 text-base leading-6 text-light-muted dark:text-dark-muted"
        >
          {club.description}
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-3 border-t border-light-hairline pt-4 dark:border-dark-hairline">
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={16} color={brand.blue} />
            <Text className="text-xs text-light-secondary dark:text-dark-secondary">
              {club.day} · {club.time}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="location-outline" size={16} color={brand.green} />
            <Text className="text-xs text-light-secondary dark:text-dark-secondary">
              {club.location}
            </Text>
          </View>
        </View>
        <View className="mt-4 flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="people-outline" size={16} color={brand.blue} />
            <Text className="text-xs text-light-muted dark:text-dark-muted">
              {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
            </Text>
          </View>
          <PressableScale
            onPress={(event) => {
              event.stopPropagation();
              onToggleJoin();
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: joined }}
            accessibilityLabel={
              joined
                ? `Leave ${club.name}`
                : pending
                  ? `Join ${club.name}`
                  : `Join ${club.name}`
            }
            className={`min-h-11 flex-row items-center gap-2 rounded-full px-4 ${joined ? "bg-python-green/10" : pending ? "bg-warn/10" : "bg-python-blue/10"}`}
          >
            <Ionicons
              name={
                joined
                  ? "checkmark-circle"
                  : pending
                    ? "time-outline"
                    : "add-circle-outline"
              }
              size={18}
              color={color}
            />
            <Text style={{ color }} className="text-sm font-bold">
              {label}
            </Text>
          </PressableScale>
        </View>
      </PressableCard>
    </View>
  );
}
export const ClubCard = memo(ClubCardBase);
