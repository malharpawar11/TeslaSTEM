import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Club, clubInitials } from '@/types/domain';
import { Gradient, BRAND_COLORS } from './Gradient';
import { PressableScale } from './PressableScale';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  club: Club;
  onBack: () => void;
}

export function ClubProfileHeader({ club, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Gradient
      colors={BRAND_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-b-3xl px-5 pb-7"
    >
      <View
        className="flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 8 }}
      >
        <PressableScale
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-11 w-11 items-center justify-center rounded-full bg-white/20"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </PressableScale>
        <ThemeToggle />
      </View>

      <View className="mt-5 flex-row items-center gap-4">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
          <Text className="text-2xl font-extrabold text-white">{clubInitials(club.name)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-white">{club.name}</Text>
          <View className="mt-2 flex-row items-center gap-2">
            <View className="rounded-full bg-white/25 px-3 py-1">
              <Text className="text-xs font-bold text-white">{club.category}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="people" size={14} color="#FFFFFF" />
              <Text className="text-xs font-semibold text-white">
                {club.memberCount} members
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Gradient>
  );
}
