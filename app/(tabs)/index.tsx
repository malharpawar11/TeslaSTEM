import { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Gradient, BRAND_COLORS } from '@/components/Gradient';
import { PressableScale } from '@/components/PressableScale';
import { ThemeToggle } from '@/components/ThemeToggle';

function FloatingShape({
  className,
  delay,
  distance,
}: {
  className: string;
  delay: number;
  distance: number;
}) {
  const offset = useSharedValue(0);
  useEffect(() => {
    offset.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [offset, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -distance * offset.value }, { scale: 1 + 0.06 * offset.value }],
  }));
  return <Animated.View style={style} className={className} pointerEvents="none" />;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Gradient
      colors={BRAND_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <FloatingShape
        className="absolute left-8 top-32 h-24 w-24 rounded-full bg-white/10"
        delay={0}
        distance={26}
      />
      <FloatingShape
        className="absolute right-10 top-56 h-16 w-16 rounded-3xl bg-python-green-light/25"
        delay={700}
        distance={20}
      />
      <FloatingShape
        className="absolute bottom-44 left-12 h-20 w-20 rounded-full bg-python-blue-light/25"
        delay={1400}
        distance={30}
      />

      <View
        className="flex-row justify-end px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <ThemeToggle />
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <Animated.View entering={FadeInDown.duration(600)}>
          <Image
            source={require('../../assets/teslastemlogo.png')}
            className="h-36 w-36"
            resizeMode="contain"
            accessibilityLabel="Tesla STEM Pythons logo"
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(150).duration(600)}
          className="mt-8 text-center text-4xl font-extrabold text-white"
        >
          Welcome to{'\n'}Tesla STEM Pythons
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(300).duration(600)}
          className="mt-4 text-center text-base font-medium text-white/80"
        >
          Your School Club Directory
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(450).duration(600)}
          className="mt-12 w-full gap-3"
        >
          <PressableScale
            onPress={() => router.push('/browse')}
            accessibilityRole="button"
            accessibilityLabel="Browse clubs"
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-white"
          >
            <Ionicons name="search" size={20} color="#1565C0" />
            <Text className="text-base font-extrabold text-python-blue">Browse Clubs</Text>
          </PressableScale>

          <PressableScale
            onPress={() => router.push('/admin')}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-white bg-transparent"
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text className="text-base font-extrabold text-white">Sign In</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Gradient>
  );
}
