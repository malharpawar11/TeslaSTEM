import { View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/NotificationsContext";
import { PressableScale } from "./ui/Pressable";
import { brand, surface } from "@/theme/tokens";
import { APP_MAX_WIDTH } from "@/theme/layout";



type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: "home", off: "home-outline", label: "Home" },
  browse: { on: "compass", off: "compass-outline", label: "Clubs" },
  calendar: { on: "calendar", off: "calendar-outline", label: "Calendar" },
  notifications: {
    on: "notifications",
    off: "notifications-outline",
    label: "Alerts",
  },
  account: {
    on: "person-circle",
    off: "person-circle-outline",
    label: "Profile",
  },
  messages: {
    on: "chatbubbles",
    off: "chatbubbles-outline",
    label: "Messages",
  },
};

/** Floating navigation with reserved layout space so content stays reachable. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const c = surface(isDark);
  const { unreadCount } = useNotifications();

  const visibleRoutes = state.routes.filter((r) => ICONS[r.name]);

  const activeColor = brand.blue;
  const activeColorDark = "#93B8FF";
  const inactiveColor = c.muted;

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: Math.max(12, insets.left, insets.right),
        paddingTop: 8,
        paddingBottom: Math.max(12, insets.bottom),
        backgroundColor: c.bg,
      }}
    >
      <View
        className="flex-row"
        style={{
          width: "100%",
          maxWidth: APP_MAX_WIDTH,
          alignSelf: "center",
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 26,
          paddingVertical: 8,
          paddingHorizontal: 4,
          shadowColor: "#13213D",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 18,
          elevation: 8,
        }}
      >
        {visibleRoutes.map((route) => {
          const realIndex = state.routes.findIndex((r) => r.key === route.key);
          const meta = ICONS[route.name];
          const focused = state.index === realIndex;
          const color = focused
            ? isDark
              ? activeColorDark
              : activeColor
            : inactiveColor;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented)
              navigation.navigate(route.name);
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
              className="flex-1 items-center justify-center gap-1 pb-1 pt-1"
              style={{ minHeight: 48 }}
            >
              <View
                style={{
                  borderRadius: 18,
                  paddingHorizontal: 13,
                  paddingVertical: 5,
                  backgroundColor: focused
                    ? isDark
                      ? "#2563EB30"
                      : "#2563EB12"
                    : "transparent",
                }}
              >
                <Ionicons
                  name={focused ? meta.on : meta.off}
                  size={21}
                  color={color}
                />
                {/* Unread badge: only the Alerts tab carries one. */}
                {route.name === "notifications" && unreadCount > 0 ? (
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", top: -3, right: -7 }}
                    className="h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1"
                  >
                    <Text className="text-[9px] font-semibold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={{ color }}
                className={`text-2xs ${focused ? "font-semibold" : "font-normal"}`}
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

