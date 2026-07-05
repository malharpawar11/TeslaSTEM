import { useEffect, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Gradient, BRAND_COLORS_RICH } from '@/components/Gradient';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, PressableScale, categoryTone } from '@/components/ui';
import { useFollows } from '@/context/FollowContext';
import { useClubs } from '@/context/ClubsContext';
import { clubInitials } from '@/types/domain';
import { duration, easing } from '@/theme/motion';
import { brand } from '@/theme/tokens';

/* ----------------------------------------------------------------------------
 * Ambient orbs — three slow-orbiting low-alpha rings that drift on a long loop.
 * -------------------------------------------------------------------------- */
function Orb({
  size,
  topPct,
  leftPct,
  drift,
  delayMs,
  durationMs,
  className,
}: {
  size: number;
  topPct: number;
  leftPct: number;
  drift: number;
  delayMs: number;
  durationMs: number;
  className: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }),
        -1,
        true,
      ),
    );
  }, [t, delayMs, durationMs]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift * (t.value - 0.5) },
      { translateY: -drift * 0.6 * (t.value - 0.5) },
      { scale: 1 + 0.03 * t.value },
    ],
    opacity: 0.55 + 0.25 * t.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          top: `${topPct}%`,
          left: `${leftPct}%`,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderRadius: size / 2,
        },
        style,
      ]}
      className={className}
    />
  );
}

/* ----------------------------------------------------------------------------
 * Animated proof dot — a tiny pulse next to the live club count.
 * -------------------------------------------------------------------------- */
function PulseDot() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: easing.smooth }),
        withTiming(0, { duration: 1200, easing: easing.smooth }),
      ),
      -1,
      false,
    );
  }, [p]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - p.value),
    transform: [{ scale: 1 + 1.8 * p.value }],
  }));
  return (
    <View className="relative h-1.5 w-1.5 items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={ring}
        className="absolute h-1.5 w-1.5 rounded-full bg-python-green-100"
      />
      <View className="h-1.5 w-1.5 rounded-full bg-python-green-100" />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { follows } = useFollows();
  const { clubs } = useClubs();

  const followedClubs = useMemo(
    () => clubs.filter((c) => follows.has(c.id)),
    [clubs, follows],
  );

  return (
    <Gradient
      colors={BRAND_COLORS_RICH as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      locations={[0, 0.5, 1] as unknown as readonly [number, number, ...number[]]}
      className="flex-1"
    >
      {/* Deep vignette overlay */}
      <View
        pointerEvents="none"
        className="absolute inset-0 bg-python-blue-900/20 dark:bg-black/35"
      />

      {/* Ambient orbs */}
      <Orb
        size={520}
        topPct={18}
        leftPct={82}
        drift={36}
        delayMs={0}
        durationMs={9200}
        className="bg-white/[0.05]"
      />
      <Orb
        size={360}
        topPct={78}
        leftPct={12}
        drift={28}
        delayMs={900}
        durationMs={10800}
        className="bg-python-green-300/12"
      />
      <Orb
        size={220}
        topPct={62}
        leftPct={88}
        drift={22}
        delayMs={1700}
        durationMs={8400}
        className="bg-python-blue-300/12"
      />

      {/* Top bar — logo icon + brand label on left, theme toggle on right */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ paddingTop: insets.top + 2 }}
      >
        <Animated.View entering={FadeIn.duration(duration.lg)} className="flex-row items-center gap-2">
          <Image
            source={require('../../assets/teslastemlogo.png')}
            style={{ width: 20, height: 20 }}
            resizeMode="contain"
            accessibilityLabel="Tesla STEM Pythons logo"
          />
          <Text className="text-2xs font-semibold uppercase tracking-widest text-white/85">
            Tesla STEM Pythons
          </Text>
        </Animated.View>
        <ThemeToggle variant="translucent" />
      </View>

      {/* ----------------------------------------------------------------
          Hero — left-aligned typographic lockup with tight vertical rhythm.
          ---------------------------------------------------------------- */}
      <View className="flex-1 justify-center px-7" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="max-w-[520px]">

          {/* Live proof tile */}
          <Animated.View
            entering={FadeInDown.duration(duration.lg)}
          >
            <View className="flex-row items-center gap-2">
              <PulseDot />
              <Text className="text-2xs font-semibold uppercase tracking-widest text-white/70">
                Live directory
              </Text>
            </View>
            <Text className="mt-1.5 text-sm font-medium text-white/85">
              <Text className="font-bold text-white">47 clubs</Text>
              <Text className="text-white/60">  ·  </Text>
              <Text className="font-bold text-white">1,000+</Text>
              <Text className="text-white/85"> Pythons</Text>
            </Text>
          </Animated.View>

          {/* Display headline — tighter gap from the stats pill */}
          <Animated.Text
            entering={FadeInDown.delay(120).duration(duration.xl)}
            className="mt-6 text-5xl font-extrabold tracking-tightest text-white"
          >
            Every club.{'\n'}
            <Text className="text-white/70">One directory.</Text>
          </Animated.Text>

          {/* Supporting subtitle — tighter gap from headline */}
          <Animated.Text
            entering={FadeInDown.delay(220).duration(duration.xl)}
            className="mt-3 max-w-[420px] text-base leading-6 text-white/75"
          >
            The official home for student clubs at Tesla STEM High. Discover what's
            running, follow the rooms you care about, and stay close to the work.
          </Animated.Text>

          {/* CTAs — primary button + plain text link */}
          <Animated.View
            entering={FadeInDown.delay(340).duration(duration.xl)}
            className="mt-7 gap-0"
          >
            <Button
              label="Explore the directory"
              onPress={() => router.push('/browse')}
              variant="primary"
              size="xl"
              fullWidth
              className="h-[60px] bg-white shadow-floating"
            >
              <Text className="flex-1 text-center text-lg font-bold tracking-tight text-python-blue-700">
                Explore the directory
              </Text>
              <Ionicons name="arrow-forward" size={22} color="#0F4C92" />
            </Button>

            {/* Admin entry — plain text link, visually subordinate */}
            <TouchableOpacity
              onPress={() => router.push('/admin')}
              accessibilityRole="button"
              activeOpacity={0.6}
              className="mt-4 items-center"
            >
              <Text className="text-sm font-medium text-white">
                I'm a club admin
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Your clubs — only shown when the user follows at least one */}
          {followedClubs.length > 0 ? (
            <Animated.View
              entering={FadeInDown.delay(460).duration(duration.xl)}
              className="mt-8"
            >
              <Text className="mb-3 text-2xs font-bold uppercase tracking-widest text-white/70">
                Your clubs
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {followedClubs.map((club) => {
                  const tone = categoryTone(club.category);
                  const dotColor = tone === 'brand' ? brand.green : brand.blue;
                  return (
                    <PressableScale
                      key={club.id}
                      onPress={() => router.push(`/club/${club.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${club.name}`}
                      scaleTo={0.94}
                      pressedOpacity={0.8}
                      className="flex-row items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.12] px-3.5 py-2.5"
                    >
                      {/* Initials badge */}
                      <View
                        style={{ width: 24, height: 24, backgroundColor: dotColor + '33', borderRadius: 8 }}
                        className="items-center justify-center"
                      >
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>
                          {clubInitials(club.name)}
                        </Text>
                      </View>
                      <Text
                        className="text-sm font-semibold text-white"
                        numberOfLines={1}
                        style={{ maxWidth: 130 }}
                      >
                        {club.name}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </Animated.View>
          ) : null}

        </View>
      </View>

      {/* Bottom hairline rule */}
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-0 right-0 h-px bg-white/10"
      />
    </Gradient>
  );
}
