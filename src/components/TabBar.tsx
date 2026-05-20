import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/context/ThemeContext';
import { PressableScale } from './ui/Pressable';
import { brand } from '@/theme/tokens';
import { spring, timing } from '@/theme/motion';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

cssInterop(BlurView, { className: 'style' });

const IS_WEB = Platform.OS === 'web';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: 'home', off: 'home-outline', label: 'Home' },
  browse: { on: 'search', off: 'search-outline', label: 'Browse' },
  submit: { on: 'add', off: 'add', label: 'Submit' },
  admin: { on: 'shield-checkmark', off: 'shield-checkmark-outline', label: 'Admin' },
  policies: { on: 'document-text', off: 'document-text-outline', label: 'Policies' },
};

const INDICATOR_HEIGHT = 36;
const INDICATOR_INSET_X = 10;

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
  const numTabs = visibleRoutes.length;
  const focusedRouteName = state.routes[state.index]?.name;
  const focusedVisibleIndex = visibleRoutes.findIndex((r) => r.name === focusedRouteName);

  const [barSize, setBarSize] = useState({ width: 0, height: 0 });
  const indicatorX = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const tabWidth = barSize.width > 0 ? barSize.width / numTabs : 0;
  const indicatorWidth = Math.max(tabWidth - INDICATOR_INSET_X * 2, 0);
  // Vertically center the indicator inside the actual bar interior.
  const indicatorTop = Math.max((barSize.height - INDICATOR_HEIGHT) / 2, 8);

  // Hide the indicator when the raised Submit CTA is focused — the raised
  // button is its own focal point and the pill behind it would look noisy.
  const submitFocused = focusedRouteName === 'submit';

  useEffect(() => {
    if (barSize.width === 0 || focusedVisibleIndex < 0) return;
    const targetX = focusedVisibleIndex * tabWidth + INDICATOR_INSET_X;
    indicatorX.value = withSpring(targetX, spring.pop);
    indicatorOpacity.value = withTiming(submitFocused ? 0 : 1, timing.smooth);
  }, [focusedVisibleIndex, tabWidth, barSize.width, submitFocused, indicatorX, indicatorOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    opacity: indicatorOpacity.value,
    width: indicatorWidth,
  }));

  const activeIconColor = brand.green;
  const inactiveIconColor = isDark ? '#8A8F99' : '#6B7280';

  const tabContent = (
    <>
      {/* Animated active pill indicator */}
      {numTabs > 0 && barSize.height > 0 && (
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-2xl bg-python-green/15 dark:bg-python-green/20"
          style={[
            {
              left: 0,
              top: indicatorTop,
              height: INDICATOR_HEIGHT,
            },
            indicatorStyle,
          ]}
        />
      )}

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

        // Special raised CTA for the Submit tab
        if (route.name === 'submit') {
          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel="Submit a club"
              className="flex-1 items-center justify-center"
            >
              <View
                className="items-center justify-center rounded-full bg-python-green"
                style={{
                  width: 48,
                  height: 48,
                  marginTop: IS_WEB ? 0 : -22,
                  shadowColor: brand.green,
                  shadowOpacity: 0.55,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 12,
                  borderWidth: 2,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
                }}
              >
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </View>
              <Text
                className={`mt-0.5 text-2xs font-bold uppercase tracking-wider ${
                  focused
                    ? 'text-python-green-dark dark:text-python-green-light'
                    : 'text-light-muted dark:text-dark-muted'
                }`}
              >
                Submit
              </Text>
            </PressableScale>
          );
        }

        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            className="flex-1 items-center justify-center"
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
                  : 'text-light-muted dark:text-dark-muted'
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
          onLayout={(e) =>
            setBarSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          }
          className="flex-row rounded-3xl overflow-hidden border border-light-hairline dark:border-dark-border bg-light-surface dark:bg-dark-surface pt-2.5 pb-2.5"
          style={{
            // @ts-ignore — web only
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.45)'
              : '0 8px 24px rgba(0,0,0,0.12)',
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
        onLayout={(e) =>
          setBarSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
        className="flex-row rounded-3xl overflow-hidden border border-white/30 dark:border-white/10 bg-light-surface/85 dark:bg-dark-surface/80 pt-2.5 pb-2.5"
        style={{
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.45 : 0.15,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 16 },
          elevation: 20,
        }}
      >
        {tabContent}
      </BlurView>
    </View>
  );
}
