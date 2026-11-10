import { Link, usePathname, useRouter } from "expo-router";
import { Image, Pressable, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { AccessibleText as Text } from "./AccessibleText";
import { Display, Glyph, useHover } from "./system";
import { useNotifications } from "@/context/NotificationsContext";
import { useTheme } from "@/context/ThemeContext";
import { RAIL_WIDTH } from "@/theme/layout";
import { spring } from "@/theme/motion";

const items = [
  ["/", "Home"],
  ["/browse", "Clubs"],
  ["/calendar", "Calendar"],
  ["/map", "Map"],
  ["/notifications", "Alerts"],
  ["/account", "Profile"],
] as const;

function isActive(href: string, path: string) {
  if (href === "/browse") return path === "/browse" || path.startsWith("/club");
  if (href === "/account")
    return path === "/account" || path === "/settings";
  return href === path;
}

function RailItem({
  href,
  label,
  active,
  badge,
}: {
  href: (typeof items)[number][0];
  label: string;
  active: boolean;
  badge: number;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Link href={href} asChild>
      <Pressable
        {...hoverProps}
        accessibilityRole="link"
        aria-current={active ? "page" : undefined}
        accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
        className="h-12 flex-row items-center"
      >
        {active ? (
          <Animated.View
            layout={LinearTransition.springify()
              .damping(spring.gentle.damping)
              .stiffness(spring.gentle.stiffness)}
            className="absolute -left-6 h-9 w-2 bg-python-blue"
          />
        ) : null}
        <Display
          fontSize={32}
          className={
            active || hovered
              ? "text-light-text dark:text-dark-text"
              : "text-light-muted dark:text-dark-muted"
          }
        >
          {label}
        </Display>
        {badge ? (
          <View className="ml-2 min-w-5 items-center rounded-sm bg-python-blue px-1">
            <Text className="text-xs font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

/** Desktop navigation: a printed index down the left edge of the sheet. */
export function WebsiteNavigation() {
  const path = usePathname();
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  return (
    <View
      style={{ width: RAIL_WIDTH }}
      className="justify-between border-r border-light-border bg-light-bg px-6 pb-6 pt-7 dark:border-dark-border dark:bg-dark-bg"
    >
      <View>
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Tesla STEM Clubs home"
            className="flex-row items-center gap-3"
          >
            <Image
              source={require("../../assets/teslastemlogo.png")}
              style={{ width: 40, height: 44 }}
              resizeMode="contain"
              accessibilityLabel=""
            />
            <Text className="text-sm font-bold leading-4 text-light-text dark:text-dark-text">
              Tesla STEM{"\n"}Clubs
            </Text>
          </Pressable>
        </Link>
        <View role="navigation" className="mt-12">
          {items.map(([href, label]) => (
            <RailItem
              key={href}
              href={href}
              label={label}
              active={isActive(href, path)}
              badge={href === "/notifications" ? unreadCount : 0}
            />
          ))}
        </View>
      </View>
      <View className="gap-1">
        <Pressable
          onPress={() => router.push("/search")}
          accessibilityRole="link"
          accessibilityLabel="Search everything"
          className="min-h-11 flex-row items-center gap-2.5"
        >
          <Glyph name="search" tone="secondary" />
          <Text className="text-sm text-light-secondary dark:text-dark-secondary">
            Search everything
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/club/new")}
          accessibilityRole="link"
          accessibilityLabel="Submit a club"
          className="min-h-11 flex-row items-center gap-2.5"
        >
          <Glyph name="add" tone="secondary" />
          <Text className="text-sm text-light-secondary dark:text-dark-secondary">
            Submit a club
          </Text>
        </Pressable>
        <Pressable
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={
            isDark ? "Switch to light mode" : "Switch to dark mode"
          }
          className="min-h-11 flex-row items-center gap-2.5"
        >
          <Glyph name={isDark ? "sunny-outline" : "moon-outline"} tone="secondary" />
          <Text className="text-sm text-light-secondary dark:text-dark-secondary">
            {isDark ? "Light mode" : "Dark mode"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
