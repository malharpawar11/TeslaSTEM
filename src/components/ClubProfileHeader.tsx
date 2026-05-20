import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Club, clubInitials } from '@/types/domain';
import { Gradient, BRAND_COLORS_RICH } from './Gradient';
import { PressableScale } from './ui/Pressable';
import { ThemeToggle } from './ThemeToggle';
import { palette } from '@/theme/tokens';

interface Props {
  club: Club;
  onBack: () => void;
  onShare?: () => void;
  scrollY: SharedValue<number>;
}

const AnimatedGradient = Animated.createAnimatedComponent(Gradient);
const AnimatedView = Animated.View;

export function ClubProfileHeader({ club, onBack, onShare, scrollY }: Props) {
  const insets = useSafeAreaInsets();

  // Parallax: when pulling down (scrollY < 0), the gradient stretches and scales.
  // When scrolling up (scrollY > 0), the header collapses slightly and shrinks.
  const gradientStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-200, 0, 200],
      [-100, 0, -40],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-200, 0, 200],
      [1.18, 1, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }, { scale }] };
  });

  const titleStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [0, 140], [1, 0.92], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 140], [0, -6], Extrapolation.CLAMP);
    return { transform: [{ translateY }, { scale }] };
  });

  const contentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 120, 200], [1, 0.92, 0.78], Extrapolation.CLAMP);
    return { opacity };
  });

  const initials = clubInitials(club.name);

  return (
    <View className="overflow-hidden rounded-b-3xl">
      <AnimatedGradient
        colors={BRAND_COLORS_RICH as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-b-3xl px-5 pb-8"
        style={gradientStyle}
      >
        {/* Decorative rings — editorial, magazine-quality depth. */}
        <View
          pointerEvents="none"
          className="absolute -right-16 -top-12 h-56 w-56 rounded-full border border-white/10 bg-white/5"
        />
        <View
          pointerEvents="none"
          className="absolute -left-20 top-24 h-72 w-72 rounded-full border border-white/10"
        />
        <View
          pointerEvents="none"
          className="absolute right-10 bottom-4 h-24 w-24 rounded-full bg-white/5"
        />

        <View
          className="flex-row items-center justify-between"
          style={{ paddingTop: insets.top + 8 }}
        >
          <PressableScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/15"
          >
            <Ionicons name="arrow-back" size={22} color={palette.white} />
          </PressableScale>

          <View className="flex-row items-center gap-2">
            {onShare ? (
              <PressableScale
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share club"
                className="h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/15"
              >
                <Ionicons name="share-outline" size={20} color={palette.white} />
              </PressableScale>
            ) : null}
            <ThemeToggle variant="translucent" />
          </View>
        </View>

        <AnimatedView style={contentStyle}>
          <View className="mt-7 flex-row items-end gap-4">
            <View className="h-22 w-22 items-center justify-center rounded-3xl border-t border-white/25 bg-white/20">
              <Text className="text-3xl font-extrabold tracking-tight text-white">
                {initials}
              </Text>
            </View>
            <View className="flex-1 pb-1">
              <Text className="text-2xs font-bold uppercase tracking-widest text-white/70">
                Tesla STEM Club
              </Text>
              <AnimatedView style={titleStyle} className="mt-1">
                <Text
                  className="text-3xl font-extrabold tracking-tight text-white"
                  style={{ lineHeight: 32 }}
                  numberOfLines={2}
                >
                  {club.name}
                </Text>
              </AnimatedView>
            </View>
          </View>

          <View className="mt-5 flex-row flex-wrap items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/20 px-3 py-1.5">
              <Ionicons name="pricetag-outline" size={12} color={palette.white} />
              <Text className="text-2xs font-bold uppercase tracking-wider text-white">
                {club.category}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/20 px-3 py-1.5">
              <Ionicons name="people-outline" size={12} color={palette.white} />
              <Text className="text-2xs font-bold uppercase tracking-wider text-white">
                {club.memberCount} members
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/20 px-3 py-1.5">
              <Ionicons name="calendar-outline" size={12} color={palette.white} />
              <Text className="text-2xs font-bold uppercase tracking-wider text-white">
                {club.day}
              </Text>
            </View>
          </View>
        </AnimatedView>
      </AnimatedGradient>
    </View>
  );
}
