import { useEffect } from 'react';
import { View, Text, Image, Platform } from 'react-native';
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
import { Button } from '@/components/ui';
import { duration, easing } from '@/theme/motion';

/* ----------------------------------------------------------------------------
 * Ambient orbs — three slow-orbiting low-alpha rings that drift on a long loop.
 * No cartoonish circles; these read as atmospheric depth, not decoration.
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
 * Logo lockup — single source of breathing motion, soft shadow.
 * -------------------------------------------------------------------------- */
function Logo() {
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breath]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.01 * breath.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.22,
            shadowRadius: 24,
          },
          android: { elevation: 10 },
          default: {
            // @ts-ignore — web only: drop-shadow follows PNG alpha channel, avoiding a white box
            filter: 'drop-shadow(0px 12px 24px rgba(3,19,37,0.35))',
          },
        }),
      ]}
    >
      <Image
        source={require('../../assets/teslastemlogo.png')}
        style={{ width: 84, height: 84 }}
        resizeMode="contain"
        accessibilityLabel="Tesla STEM Pythons logo"
      />
    </Animated.View>
  );
}

/* ----------------------------------------------------------------------------
 * A delicate vertical hairline divider used between features.
 * -------------------------------------------------------------------------- */
function Sep() {
  return <View className="h-3 w-px bg-white/25" />;
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

  return (
    <Gradient
      colors={BRAND_COLORS_RICH as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      locations={[0, 0.55, 1] as unknown as readonly [number, number, ...number[]]}
      className="flex-1"
    >
      {/* Deep vignette overlay — adds the editorial weight that flat gradients lack */}
      <View
        pointerEvents="none"
        className="absolute inset-0 bg-python-blue-900/25 dark:bg-black/40"
      />

      {/* Ambient orbs — three; one large + two small, all very low-alpha */}
      <Orb
        size={520}
        topPct={18}
        leftPct={82}
        drift={36}
        delayMs={0}
        durationMs={9200}
        className="bg-white/[0.06]"
      />
      <Orb
        size={360}
        topPct={78}
        leftPct={12}
        drift={28}
        delayMs={900}
        durationMs={10800}
        className="bg-python-green-300/15"
      />
      <Orb
        size={220}
        topPct={62}
        leftPct={88}
        drift={22}
        delayMs={1700}
        durationMs={8400}
        className="bg-python-blue-300/15"
      />

      {/* Top bar — eyebrow brand mark on the left, theme toggle on the right */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Animated.View entering={FadeIn.duration(duration.lg)}>
          <View className="flex-row items-center gap-2">
            <View className="h-1.5 w-1.5 rounded-full bg-white" />
            <Text className="text-2xs font-semibold uppercase tracking-widest text-white/85">
              Tesla STEM Pythons
            </Text>
          </View>
        </Animated.View>
        <ThemeToggle variant="translucent" />
      </View>

      {/* ----------------------------------------------------------------
          Hero — asymmetric, left-aligned, with a tight typographic lockup.
          ---------------------------------------------------------------- */}
      <View className="flex-1 justify-center px-7" style={{ paddingBottom: insets.bottom + 32 }}>
        <View className="max-w-[520px]">
          {/* Logo + live proof tile, sitting side-by-side */}
          <Animated.View
            entering={FadeInDown.duration(duration.lg)}
            className="flex-row items-center gap-4"
          >
            <Logo />
            <View className="flex-1 pl-1">
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
            </View>
          </Animated.View>

          {/* Display headline */}
          <Animated.Text
            entering={FadeInDown.delay(120).duration(duration.xl)}
            className="mt-10 text-5xl font-extrabold tracking-tightest text-white"
          >
            Every club.{'\n'}
            <Text className="text-white/70">One directory.</Text>
          </Animated.Text>

          {/* Supporting subtitle — restrained, two-line, no exclamation */}
          <Animated.Text
            entering={FadeInDown.delay(220).duration(duration.xl)}
            className="mt-5 max-w-[420px] text-base leading-6 text-white/75"
          >
            The official home for student clubs at Tesla STEM High. Discover what's
            running, follow the rooms you care about, and stay close to the work.
          </Animated.Text>

          {/* Primary + secondary CTAs */}
          <Animated.View
            entering={FadeInDown.delay(340).duration(duration.xl)}
            className="mt-9 gap-3"
          >
            <Button
              label="Explore the directory"
              onPress={() => router.push('/browse')}
              variant="primary"
              size="xl"
              fullWidth
              className="bg-white shadow-floating"
            >
              <Text className="flex-1 text-center text-base font-bold tracking-tight text-python-blue-700">
                Explore the directory
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#0F4C92" />
            </Button>

            <Button
              label="I'm a club admin"
              onPress={() => router.push('/admin')}
              variant="ghost"
              size="xl"
              fullWidth
              className="border border-white/25 bg-white/[0.06]"
            >
              <Text className="text-base font-semibold tracking-tight text-white">
                I'm a club admin
              </Text>
            </Button>
          </Animated.View>

          {/* Feature strip — three actions, chevron separators */}
          <Animated.View
            entering={FadeInDown.delay(460).duration(duration.xl)}
            className="mt-8 flex-row items-center gap-3"
          >
            <Text className="text-xs font-semibold uppercase tracking-widest text-white/75">
              Browse
            </Text>
            <Sep />
            <Text className="text-xs font-semibold uppercase tracking-widest text-white/75">
              Follow
            </Text>
            <Sep />
            <Text className="text-xs font-semibold uppercase tracking-widest text-white/75">
              Submit your club
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Bottom hairline rule — anchors the composition, signals "more below" without arrows */}
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-0 right-0 h-px bg-white/10"
      />
    </Gradient>
  );
}
