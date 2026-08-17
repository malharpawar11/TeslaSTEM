import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationsContext';
import { PressableScale } from './ui/Pressable';
import { brand, surface } from '@/theme/tokens';
import { APP_MAX_WIDTH } from '@/theme/layout';

const IS_WEB = Platform.OS === 'web';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: 'home', off: 'home-outline', label: 'Home' },
  browse: { on: 'compass', off: 'compass-outline', label: 'Clubs' },
  calendar: { on: 'calendar', off: 'calendar-outline', label: 'Calendar' },
  notifications: { on: 'notifications', off: 'notifications-outline', label: 'Alerts' },
  account: { on: 'person-circle', off: 'person-circle-outline', label: 'Profile' },
};

/**
 * Docked bottom navigation. This used to be a floating blurred pill; a docked
 * bar with a hairline is what every OS ships, it never crops content behind
 * it, and it keeps the eye on the content instead of the chrome.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const c = surface(isDark);
  const { unreadCount } = useNotifications();

  const visibleRoutes = state.routes.filter((r) => ICONS[r.name]);

  const activeColor = brand.blue;
  const activeColorDark = '#6BA1D8';
  const inactiveColor = c.muted;

  return (
    <View
      style={[
        {
          borderTopWidth: 1,
          borderTopColor: c.border,
          backgroundColor: c.surface,
          paddingBottom: IS_WEB ? 8 : insets.bottom > 0 ? insets.bottom : 8,
        },
        IS_WEB ? ({ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50 } as never) : null,
      ]}
      className="pt-1.5"
    >
      <View
        className="flex-row"
        style={IS_WEB ? { width: '100%', maxWidth: APP_MAX_WIDTH, alignSelf: 'center' } : undefined}
      >
      {visibleRoutes.map((route) => {
        const realIndex = state.routes.findIndex((r) => r.key === route.key);
        const meta = ICONS[route.name];
        const focused = state.index === realIndex;
        const color = focused ? (isDark ? activeColorDark : activeColor) : inactiveColor;

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
            scaleTo={1}
            pressedOpacity={0.6}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            className="flex-1 items-center justify-center gap-0.5 pb-1 pt-1"
            style={{ minHeight: 48 }}
          >
            <View>
              <Ionicons name={focused ? meta.on : meta.off} size={22} color={color} />
              {/* Unread badge — only the Alerts tab carries one. */}
              {route.name === 'notifications' && unreadCount > 0 ? (
                <View
                  pointerEvents="none"
                  style={{ position: 'absolute', top: -3, right: -7 }}
                  className="h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1"
                >
                  <Text className="text-[9px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{ color }}
              className={`text-2xs ${focused ? 'font-semibold' : 'font-normal'}`}
            >
              {meta.label}
            </Text>
          </PressableScale>
        );
      })}
      </View>
    </View>
  );
}
