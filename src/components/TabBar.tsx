import { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/context/ThemeContext';
import { PressableScale } from './ui/Pressable';
import { brand } from '@/theme/tokens';
import { spring } from '@/theme/motion';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

cssInterop(BlurView, { className: 'style' });

const IS_WEB = Platform.OS === 'web';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: 'home', off: 'home-outline', label: 'Home' },
  browse: { on: 'search', off: 'search-outline', label: 'Browse' },
  admin: { on: 'shield-checkmark', off: 'shield-checkmark-outline', label: 'Admin' },
  policies: { on: 'document-text', off: 'document-text-outline', label: 'Policies' },
  account: { on: 'person-circle', off: 'person-circle-outline', label: 'Account' },
};

// Animated icon wrapper — does a tiny scale bump on focus.
function AnimatedTabIcon({
  focused,
  name,
  color,
}: {
  focused: boolean;
  name: IconName;
  color: string;
}) {
  const scale = useSharedValue(focused ? 1 : 0.92);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, spring.pop);
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={22} color={color} />
    </Animated.View>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const visibleRoutes = state.routes.filter((r) => ICONS[r.name]);

  const activeIconColor = brand.green;
  const inactiveIconColor = isDark ? '#FFFFFF' : '#6B7280';

  const tabContent = (
    <>
      {visibleRoutes.map((route) => {
        const realIndex = state.routes.findIndex((r) => r.key === route.key);
        const meta = ICONS[route.name];
        const focused = state.index === realIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            // Web hover: a faint highlight on non-active tabs only, so it
            // never fights the green active pill.
            className={`flex-1 items-center justify-center rounded-2xl ${
              focused ? '' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
            style={{ minHeight: 52 }}
          >
            <AnimatedTabIcon
              focused={focused}
              name={focused ? meta.on : meta.off}
              color={focused ? activeIconColor : inactiveIconColor}
            />
            <Text
              style={{ marginTop: 2 }}
              className={`text-2xs font-bold uppercase tracking-wider ${
                focused
                  ? 'text-python-green-dark dark:text-python-green-light'
                  : 'text-light-muted dark:text-white'
              }`}
            >
              {meta.label}
            </Text>
          </PressableScale>
        );
      })}
    </>
  );

  // On web: fixed positioning so the pill overlays content (no white gap behind it)
  if (IS_WEB) {
    return (
      <View
        style={
          // Cast needed: 'fixed' is valid CSS but not in RN's ViewStyle enum.
          // This branch only runs on web.
          {
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 12,
            zIndex: 999,
            backgroundColor: 'transparent',
          } as any
        }
      >
        <View
          className="flex-row rounded-3xl overflow-hidden border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface pt-2.5 pb-2.5"
          style={{
            // @ts-ignore — web only
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.45)'
              : '0 8px 28px rgba(0,0,0,0.18)',
          }}
        >
          {tabContent}
        </View>
      </View>
    );
  }

  // On native: floating pill with BlurView
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 12,
      }}
    >
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        className="flex-row rounded-3xl overflow-hidden border border-black/[0.09] dark:border-white/10 bg-light-surface/95 dark:bg-dark-surface/80 pt-2.5 pb-2.5"
        style={{
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.45 : 0.28,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 20,
        }}
      >
        {tabContent}
      </BlurView>
    </View>
  );
}
