import { Link, usePathname } from "expo-router";
import { View } from "react-native";
import { AccessibleText as Text } from "./AccessibleText";
import { useNotifications } from "@/context/NotificationsContext";
import { APP_MAX_WIDTH } from "@/theme/layout";

const items = [
  ["/", "Home"],
  ["/browse", "Clubs"],
  ["/calendar", "Calendar"],
  ["/notifications", "Alerts"],
  ["/account", "Profile"],
] as const;

export function WebsiteNavigation() {
  const path = usePathname();
  const { unreadCount } = useNotifications();
  return (
    <View accessibilityRole="header" className="border-b border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface">
      <View style={{ maxWidth: APP_MAX_WIDTH }} className="mx-auto min-h-[76px] w-full flex-row items-center justify-between gap-6 px-6">
        <Link href="/">
          <Text className="text-xl font-bold text-light-text dark:text-dark-text">
            <Text className="text-python-blue dark:text-python-blue-light">Tesla STEM</Text> Clubs
          </Text>
        </Link>
        <View role="navigation" className="flex-row items-center gap-2">
          {items.map(([href, label]) => {
            const active = href === path || (href === "/browse" && path.startsWith("/club/"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={active
                  ? "rounded-xl bg-python-blue/10 px-4 py-3 font-semibold text-python-blue dark:text-python-blue-light"
                  : "rounded-xl px-4 py-3 text-light-secondary hover:bg-light-surface-2 dark:text-dark-secondary dark:hover:bg-dark-surface-2"}
              >
                <Text>{label}{href === "/notifications" && unreadCount ? ` (${unreadCount > 99 ? "99+" : unreadCount})` : ""}</Text>
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}
