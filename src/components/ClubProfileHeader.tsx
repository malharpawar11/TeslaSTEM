import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Club, clubInitials } from '@/types/domain';
import { Gradient, BRAND_COLORS_RICH } from './Gradient';
import { PressableScale } from './ui/Pressable';
import { ThemeToggle } from './ThemeToggle';
import { palette } from '@/theme/tokens';

interface Props {
  club: Club;
  onBack: () => void;
  onShare?: () => void;
}

/**
 * Club identity banner. Deliberately plain: a brand gradient, the club's
 * initials, its name, and the three facts a student actually needs. The
 * decorative rings and scroll parallax that used to live here were doing
 * nothing except competing with the club's own content.
 */
export function ClubProfileHeader({ club, onBack, onShare }: Props) {
  const insets = useSafeAreaInsets();

  const facts: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: 'pricetag-outline', label: club.category },
    { icon: 'people-outline', label: `${club.memberCount} member${club.memberCount === 1 ? '' : 's'}` },
    { icon: 'calendar-outline', label: club.day },
  ];

  return (
    <Gradient
      colors={BRAND_COLORS_RICH as unknown as readonly [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="px-5 pb-6">
        <View className="flex-row items-center justify-between">
          <PressableScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            scaleTo={0.94}
            pressedOpacity={0.7}
            className="h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-white/10"
          >
            <Ionicons name="arrow-back" size={19} color={palette.white} />
          </PressableScale>

          <View className="flex-row items-center gap-2">
            {onShare ? (
              <PressableScale
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share club"
                scaleTo={0.94}
                pressedOpacity={0.7}
                className="h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-white/10"
              >
                <Ionicons name="share-outline" size={18} color={palette.white} />
              </PressableScale>
            ) : null}
            <ThemeToggle variant="translucent" />
          </View>
        </View>

        <View className="mt-6 flex-row items-center gap-3.5">
          <View className="h-14 w-14 items-center justify-center rounded-xl bg-white/15">
            <Text className="text-lg font-semibold text-white">{clubInitials(club.name)}</Text>
          </View>
          <Text
            className="flex-1 text-2xl font-semibold tracking-tight text-white"
            numberOfLines={2}
          >
            {club.name}
          </Text>
        </View>

        <View className="mt-4 flex-row flex-wrap items-center gap-x-4 gap-y-2">
          {facts.map((f) => (
            <View key={f.label} className="flex-row items-center gap-1.5">
              <Ionicons name={f.icon} size={13} color="rgba(255,255,255,0.75)" />
              <Text className="text-sm text-white/80">{f.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Gradient>
  );
}
