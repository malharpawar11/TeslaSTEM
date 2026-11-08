import { Pressable, View } from "react-native";
import { AccessibleText as Text } from "@/components/AccessibleText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useNotifications } from "@/context/NotificationsContext";
import { Display } from "./system";

const LABELS: Record<string, string> = {
  index: "Home",
  browse: "Clubs",
  calendar: "Calendar",
  notifications: "Alerts",
  account: "Profile",
};

/** The same printed index as desktop, laid along the bottom edge. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const routes = state.routes.filter((r) => LABELS[r.name]);
  return (
    <View
      className="flex-row border-t-2 border-light-text bg-light-bg dark:border-dark-border dark:bg-dark-bg"
      style={{ paddingBottom: Math.max(6, insets.bottom) }}
    >
      {routes.map((route) => {
        const focused = state.routes[state.index]?.key === route.key;
        const showBadge = route.name === "notifications" && unreadCount > 0;
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
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            aria-current={focused ? "page" : undefined}
            accessibilityLabel={
              showBadge
                ? `${LABELS[route.name]}, ${unreadCount} unread`
                : LABELS[route.name]
            }
            className="flex-1 items-center pt-0"
            style={{ minHeight: 56 }}
          >
            <View
              className={`mb-2 h-1 w-full ${focused ? "bg-python-blue" : ""}`}
            />
            <View className="flex-row items-center gap-1">
              <Display
                fontSize={20}
                className={
                  focused
                    ? "text-light-text dark:text-dark-text"
                    : "text-light-muted dark:text-dark-muted"
                }
              >
                {LABELS[route.name]}
              </Display>
              {showBadge ? (
                <View className="min-w-4 items-center rounded-sm bg-python-blue px-0.5">
                  <Text className="text-2xs font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
